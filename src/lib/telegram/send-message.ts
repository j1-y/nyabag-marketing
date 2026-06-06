import "server-only";

import { getTelegramBotToken } from "@/lib/telegram/config";

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
};

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = getTelegramBotToken();

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[telegram] sendMessage failed:", response.status, body.slice(0, 300));
      return;
    }

    const data = (await response.json().catch(() => null)) as TelegramSendMessageResponse | null;
    if (data && !data.ok) {
      console.error("[telegram] sendMessage rejected:", data.description ?? "Unknown Telegram error");
    }
  } catch (error) {
    console.error("[telegram] sendMessage error:", error instanceof Error ? error.message : error);
  }
}
