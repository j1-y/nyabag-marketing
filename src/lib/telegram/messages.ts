export const telegramMessages = {
  startNotConnected:
    "Welcome to Nyabag\n\nSend your connection code from Nyabag Settings -> Connections -> Telegram to link this chat.\n\nAfter that, send any URL here and I'll save it to your Nyabag.",
  connected:
    "Connected to Nyabag. You can now send URLs here and I'll save them.",
  help:
    "Send any http:// or https:// URL here and I'll save it to Nyabag.\n\nCommands: /status, /unlink, /help",
  queuedSingle: (url: string) => `Queued for saving to Nyabag.\n${url}`,
  queuedMultiple: (count: number) => `Queued ${count} references for saving.`,
  processedSingle: (titleOrUrl: string) => `Saved to Nyabag.\n${titleOrUrl}`,
  partialFailure: (successCount: number, failedCount: number) =>
    `Queued ${successCount} references.\nCouldn't queue ${failedCount}. Try again later.`,
  noUrls: "Send me a URL and I'll save it to Nyabag.",
  unlinked: "Telegram disconnected from Nyabag.",
  notConnected:
    "This Telegram chat is not connected yet. Open Nyabag -> Settings -> Connections -> Telegram and send me your code.",
  privateOnly: "Please DM me privately to connect and save links.",
  statusConnected: "Telegram is connected to Nyabag.",
  statusNotConnected: "This Telegram chat is not connected to Nyabag yet.",
  codeExpired:
    "That connection code is invalid or expired, so Telegram was not connected. Generate a new code in Nyabag and send it here.",
  alreadyConnected:
    "This Telegram account is already connected to another Nyabag account. Disconnect it there before connecting again.",
  genericFailure: "Something went wrong. Try again later.",
};
