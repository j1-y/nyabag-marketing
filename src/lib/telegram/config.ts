import "server-only";

export function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required for Telegram operations.");
  }
  return token;
}

export function getTelegramWebhookSecret() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is required for Telegram operations.");
  }
  return secret;
}

export function getTelegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim() || null;
}

export function getTelegramBotUrl() {
  const username = getTelegramBotUsername();
  return username ? `https://t.me/${username}` : undefined;
}

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);
}
