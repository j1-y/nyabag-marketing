import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin/service";
import { createQueuedBookmarkForUser } from "@/lib/bookmarks/create-queued-bookmark-for-user";
import { isTelegramConfigured, getTelegramWebhookSecret } from "@/lib/telegram/config";
import { telegramMessages } from "@/lib/telegram/messages";
import { sendTelegramMessage } from "@/lib/telegram/send-message";
import { extractUrlsFromText } from "@/lib/telegram/url-extractor";
import { normalizeVerificationCode, verifyCode } from "@/lib/telegram/verify";
import type { TelegramConnection } from "@/lib/types";

export const dynamic = "force-dynamic";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: {
      id?: number | string;
      type?: string;
    };
    from?: {
      id?: number | string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};

type InboundLogStatus = "received" | "processed" | "failed" | "ignored" | "verification";

function ok() {
  return new Response("OK", { status: 200 });
}

function asTextId(value: number | string | undefined) {
  return value === undefined || value === null ? null : String(value);
}

function getCommand(text: string) {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!first.startsWith("/")) return null;
  return first.split("@")[0];
}

function isVerificationCodeText(text: string) {
  return /^NYB-\d{6}$/.test(normalizeVerificationCode(text));
}

async function safeReply(chatId: string | null, text: string) {
  if (!chatId) return;
  await sendTelegramMessage(chatId, text);
}

async function insertInboundLog({
  supabase,
  update,
  updateId,
  messageId,
  telegramUserId,
  telegramChatId,
  messageText,
  status = "received",
}: {
  supabase: ReturnType<typeof createAdminServiceClient>;
  update: TelegramUpdate;
  updateId: string | null;
  messageId: string | null;
  telegramUserId: string | null;
  telegramChatId: string | null;
  messageText: string;
  status?: InboundLogStatus;
}) {
  const { data, error } = await supabase
    .from("telegram_inbound_messages")
    .insert({
      provider_message_id: messageId,
      telegram_update_id: updateId,
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      message_text: messageText,
      status,
      raw_payload: update,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[telegram] inbound log insert failed:", error.message);
    return null;
  }

  return data?.id as string | undefined;
}

async function updateInboundLog({
  supabase,
  id,
  status,
  userId,
  extractedUrls,
  error,
}: {
  supabase: ReturnType<typeof createAdminServiceClient>;
  id: string | null | undefined;
  status: InboundLogStatus;
  userId?: string | null;
  extractedUrls?: string[];
  error?: string | null;
}) {
  if (!id) return;

  const { error: updateError } = await supabase
    .from("telegram_inbound_messages")
    .update({
      status,
      user_id: userId ?? undefined,
      extracted_urls: extractedUrls ?? undefined,
      error: error ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[telegram] inbound log update failed:", updateError.message);
  }
}

async function findConnectedConnection(
  supabase: ReturnType<typeof createAdminServiceClient>,
  telegramUserId: string | null,
  telegramChatId: string | null
) {
  if (!telegramUserId && !telegramChatId) return null;

  const filters = [
    telegramUserId ? `telegram_user_id.eq.${telegramUserId}` : null,
    telegramChatId ? `telegram_chat_id.eq.${telegramChatId}` : null,
  ].filter(Boolean);

  const { data, error } = await supabase
    .from("telegram_connections")
    .select("*")
    .eq("status", "connected")
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[telegram] connection lookup failed:", error.message);
    return null;
  }

  return data as TelegramConnection | null;
}

async function handleVerification({
  supabase,
  text,
  telegramUserId,
  telegramChatId,
  telegramUsername,
  firstName,
  lastName,
}: {
  supabase: ReturnType<typeof createAdminServiceClient>;
  text: string;
  telegramUserId: string | null;
  telegramChatId: string | null;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  if (!telegramUserId || !telegramChatId || !isVerificationCodeText(text)) {
    return { matched: false as const };
  }

  const { data: pending, error } = await supabase
    .from("telegram_connections")
    .select("id,user_id,verification_code_hash")
    .eq("status", "pending")
    .gt("verification_code_expires_at", new Date().toISOString())
    .not("verification_code_hash", "is", null)
    .limit(100);

  if (error) {
    console.error("[telegram] pending connection lookup failed:", error.message);
    return { matched: false as const, error: error.message };
  }

  const match = (pending ?? []).find((row) => {
    try {
      return row.verification_code_hash && verifyCode(text, row.verification_code_hash);
    } catch {
      return false;
    }
  });

  if (!match) return { matched: false as const };

  const { data: existing, error: existingError } = await supabase
    .from("telegram_connections")
    .select("id,user_id")
    .eq("telegram_user_id", telegramUserId)
    .eq("status", "connected")
    .neq("user_id", match.user_id)
    .maybeSingle();

  if (existingError) {
    console.error("[telegram] existing Telegram account lookup failed:", existingError.message);
    return { matched: true as const, connected: false as const, userId: match.user_id as string, error: existingError.message };
  }

  if (existing) {
    return { matched: true as const, connected: false as const, userId: match.user_id as string, alreadyConnected: true as const };
  }

  const { error: updateError } = await supabase
    .from("telegram_connections")
    .update({
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      telegram_username: telegramUsername,
      first_name: firstName,
      last_name: lastName,
      status: "connected",
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      verification_code_hash: null,
      verification_code_expires_at: null,
    })
    .eq("id", match.id)
    .eq("user_id", match.user_id);

  if (updateError) {
    console.error("[telegram] connection update failed:", updateError.message);
    return { matched: true as const, connected: false as const, userId: match.user_id as string, error: updateError.message };
  }

  return { matched: true as const, connected: true as const, userId: match.user_id as string };
}

export async function GET() {
  return NextResponse.json({ ok: true, configured: isTelegramConfigured() });
}

export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return new Response("Telegram is not configured", { status: 503 });
  }

  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (receivedSecret !== getTelegramWebhookSecret()) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const message = update.message;
  if (!message) return ok();

  const text = message.text ?? "";
  const chatId = asTextId(message.chat?.id);
  const chatType = message.chat?.type ?? "";
  const telegramUserId = asTextId(message.from?.id);
  const telegramChatId = chatId;
  const updateId = asTextId(update.update_id);
  const messageId = asTextId(message.message_id);
  const telegramUsername = message.from?.username ?? null;
  const firstName = message.from?.first_name ?? null;
  const lastName = message.from?.last_name ?? null;

  const supabase = createAdminServiceClient();
  const logId = await insertInboundLog({
    supabase,
    update,
    updateId,
    messageId,
    telegramUserId,
    telegramChatId,
    messageText: text,
  });

  if (!text) {
    await updateInboundLog({ supabase, id: logId, status: "ignored" });
    return ok();
  }

  if (chatType !== "private") {
    await safeReply(chatId, telegramMessages.privateOnly);
    await updateInboundLog({ supabase, id: logId, status: "ignored" });
    return ok();
  }

  const command = getCommand(text);

  if (command === "/start") {
    const connection = await findConnectedConnection(supabase, telegramUserId, telegramChatId);
    await safeReply(chatId, connection ? telegramMessages.connected : telegramMessages.startNotConnected);
    await updateInboundLog({ supabase, id: logId, status: "processed", userId: connection?.user_id ?? null });
    return ok();
  }

  if (command === "/help") {
    const connection = await findConnectedConnection(supabase, telegramUserId, telegramChatId);
    await safeReply(chatId, telegramMessages.help);
    await updateInboundLog({ supabase, id: logId, status: "processed", userId: connection?.user_id ?? null });
    return ok();
  }

  if (command === "/status") {
    const connection = await findConnectedConnection(supabase, telegramUserId, telegramChatId);
    await safeReply(chatId, connection ? telegramMessages.statusConnected : telegramMessages.statusNotConnected);
    await updateInboundLog({ supabase, id: logId, status: "processed", userId: connection?.user_id ?? null });
    return ok();
  }

  if (command === "/unlink") {
    const connection = await findConnectedConnection(supabase, telegramUserId, telegramChatId);
    if (!connection) {
      await safeReply(chatId, telegramMessages.statusNotConnected);
      await updateInboundLog({ supabase, id: logId, status: "processed" });
      return ok();
    }

    const { error } = await supabase
      .from("telegram_connections")
      .update({
        status: "disabled",
        verification_code_hash: null,
        verification_code_expires_at: null,
        disconnected_at: new Date().toISOString(),
      })
      .eq("id", connection.id)
      .eq("user_id", connection.user_id);

    if (error) {
      console.error("[telegram] unlink failed:", error.message);
      await safeReply(chatId, telegramMessages.genericFailure);
      await updateInboundLog({ supabase, id: logId, status: "failed", userId: connection.user_id, error: error.message });
      return ok();
    }

    await safeReply(chatId, telegramMessages.unlinked);
    await updateInboundLog({ supabase, id: logId, status: "processed", userId: connection.user_id });
    return ok();
  }

  const verification = await handleVerification({
    supabase,
    text,
    telegramUserId,
    telegramChatId,
    telegramUsername,
    firstName,
    lastName,
  });

  if (!verification.matched && verification.error && isVerificationCodeText(text)) {
    await safeReply(chatId, telegramMessages.genericFailure);
    await updateInboundLog({
      supabase,
      id: logId,
      status: "failed",
      error: verification.error,
    });
    return ok();
  }

  if (verification.matched) {
    if (verification.connected) {
      await safeReply(chatId, telegramMessages.connected);
      await updateInboundLog({ supabase, id: logId, status: "verification", userId: verification.userId });
      return ok();
    }

    await safeReply(
      chatId,
      verification.alreadyConnected ? telegramMessages.alreadyConnected : telegramMessages.genericFailure
    );
    await updateInboundLog({
      supabase,
      id: logId,
      status: "failed",
      userId: verification.userId,
      error: verification.error ?? (verification.alreadyConnected ? "Telegram user already connected" : "Verification failed"),
    });
    return ok();
  }

  const connection = await findConnectedConnection(supabase, telegramUserId, telegramChatId);
  if (!connection) {
    await safeReply(chatId, isVerificationCodeText(text) ? telegramMessages.codeExpired : telegramMessages.notConnected);
    await updateInboundLog({ supabase, id: logId, status: "ignored" });
    return ok();
  }

  const urls = extractUrlsFromText(text);
  if (urls.length === 0) {
    await safeReply(chatId, telegramMessages.noUrls);
    await updateInboundLog({ supabase, id: logId, status: "ignored", userId: connection.user_id, extractedUrls: [] });
    return ok();
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const url of urls) {
    const result = await createQueuedBookmarkForUser({
      supabase,
      userId: connection.user_id,
      url,
      source: "telegram",
    });

    if (result.success) {
      successCount += 1;
    } else {
      failedCount += 1;
      errors.push(`${url}: ${result.error}`);
      console.error("[telegram] queued bookmark insert failed:", result.error);
    }
  }

  if (successCount === 1 && failedCount === 0) {
    await safeReply(chatId, telegramMessages.queuedSingle(urls[0]));
  } else if (successCount > 0 && failedCount === 0) {
    await safeReply(chatId, telegramMessages.queuedMultiple(successCount));
  } else if (successCount > 0) {
    await safeReply(chatId, telegramMessages.partialFailure(successCount, failedCount));
  } else {
    await safeReply(chatId, telegramMessages.genericFailure);
  }

  await updateInboundLog({
    supabase,
    id: logId,
    status: failedCount > 0 ? "failed" : "processed",
    userId: connection.user_id,
    extractedUrls: urls,
    error: errors.length > 0 ? errors.join("\n").slice(0, 1000) : null,
  });

  return ok();
}
