import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  return null;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeBaseUrl(value) {
  return value?.trim().replace(/\/+$/, "");
}

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const explicitUrl = getArgValue("--url");
const explicitBaseUrl = getArgValue("--base-url") || process.argv.find((arg, index) => index > 1 && !arg.startsWith("--"));
const baseUrl = normalizeBaseUrl(explicitUrl ? explicitUrl.replace(/\/api\/telegram\/webhook\/?$/, "") : explicitBaseUrl || process.env.NEXT_PUBLIC_APP_URL);

if (!token) fail("TELEGRAM_BOT_TOKEN is not configured.");
if (!secret) fail("TELEGRAM_WEBHOOK_SECRET is not configured.");
if (!baseUrl) fail("Set NEXT_PUBLIC_APP_URL or pass --url https://your-domain/api/telegram/webhook.");

const webhookUrl = explicitUrl
  ? explicitUrl.trim()
  : `${baseUrl}/api/telegram/webhook`;

if (!/^https:\/\//i.test(webhookUrl)) {
  fail(`Telegram webhooks require a public HTTPS URL. Received: ${webhookUrl}`);
}

try {
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message"],
    }),
    cache: "no-store",
  });
  const body = await response.json();

  if (!body.ok) {
    fail(`Telegram setWebhook failed: ${body.description ?? "Unknown error"}`);
  }

  console.log("Telegram webhook registered.");
  console.log(`- url: ${webhookUrl}`);
  console.log("- allowed updates: message");
  console.log("- secret token: configured");
} catch (error) {
  fail(`Telegram setWebhook failed: ${error instanceof Error ? error.message : String(error)}`);
}
