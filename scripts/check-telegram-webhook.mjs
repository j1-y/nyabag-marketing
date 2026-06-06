import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

if (!token) {
  fail("TELEGRAM_BOT_TOKEN is not configured.");
} else {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
      cache: "no-store",
    });
    const body = await response.json();

    if (!body.ok) {
      fail(`Telegram getWebhookInfo failed: ${body.description ?? "Unknown error"}`);
    } else {
      const info = body.result ?? {};
      const hasWebhook = Boolean(info.url);

      console.log("Telegram webhook status");
      console.log(`- configured: ${hasWebhook ? "yes" : "no"}`);
      console.log(`- url: ${hasWebhook ? info.url : "(none)"}`);
      console.log(`- pending updates: ${info.pending_update_count ?? 0}`);
      console.log(`- max connections: ${info.max_connections ?? "(default)"}`);
      console.log(`- allowed updates: ${Array.isArray(info.allowed_updates) ? info.allowed_updates.join(", ") : "(default)"}`);

      if (info.last_error_message) {
        const date = info.last_error_date
          ? new Date(info.last_error_date * 1000).toISOString()
          : "unknown time";
        console.log(`- last error: ${info.last_error_message} (${date})`);
      }

      if (!hasWebhook) {
        console.log("");
        console.log("No webhook URL is registered. Run npm run telegram:set-webhook after setting NEXT_PUBLIC_APP_URL or pass --url.");
      }
    }
  } catch (error) {
    fail(`Telegram webhook check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
