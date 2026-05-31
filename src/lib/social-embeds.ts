export type SocialProvider = "x" | "facebook" | "linkedin";
export const SOCIAL_NOTE_PREFIX = "nyabag-social:";

export type SocialEmbed =
  | { provider: "x"; url: string; statusId: string }
  | { provider: "facebook"; url: string; iframeSrc: string }
  | { provider: "linkedin"; url: string; iframeSrc: string | null };

export type SocialEmbedSize = {
  width: number;
  height: number;
};

export const SOCIAL_EMBED_SIZE: Record<SocialProvider, SocialEmbedSize> = {
  x: { width: 550, height: 640 },
  facebook: { width: 500, height: 650 },
  linkedin: { width: 504, height: 620 },
};

function normalizedUrl(raw: string): URL | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
}

export function isSocialNoteContent(content: string): boolean {
  return content === SOCIAL_NOTE_PREFIX || content.startsWith(SOCIAL_NOTE_PREFIX);
}

export function getSocialNoteUrl(content: string): string {
  return isSocialNoteContent(content) ? content.slice(SOCIAL_NOTE_PREFIX.length) : content;
}

export function toSocialNoteContent(url: string): string {
  return `${SOCIAL_NOTE_PREFIX}${url}`;
}

export function parseSocialEmbed(raw: string): SocialEmbed | null {
  const url = normalizedUrl(getSocialNoteUrl(raw));
  if (!url) return null;

  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  const href = url.toString();

  if (hostname === "x.com" || hostname === "twitter.com" || hostname === "mobile.twitter.com") {
    const statusId = url.pathname.match(/\/status(?:es)?\/(\d+)/)?.[1];
    if (!statusId) return null;
    return {
      provider: "x",
      url: href.replace("https://x.com/", "https://twitter.com/").replace("https://mobile.twitter.com/", "https://twitter.com/"),
      statusId,
    };
  }

  if (hostname === "facebook.com" || hostname.endsWith(".facebook.com") || hostname === "fb.watch") {
    const path = url.pathname.toLowerCase();
    const isPost =
      path.includes("/posts/") ||
      path.includes("/share/") ||
      path.includes("/permalink.php") ||
      path.includes("/photo.php") ||
      path.includes("/videos/") ||
      path.includes("/watch/") ||
      path.includes("/reel/") ||
      path.includes("/story.php") ||
      url.searchParams.has("story_fbid");
    if (!isPost) return null;

    const plugin = new URL("https://www.facebook.com/plugins/post.php");
    plugin.searchParams.set("href", href);
    plugin.searchParams.set("show_text", "true");
    plugin.searchParams.set("width", "500");
    return { provider: "facebook", url: href, iframeSrc: plugin.toString() };
  }

  if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
    const path = url.pathname.toLowerCase();
    const activityId = url.pathname.match(/activity-(\d+)/)?.[1];
    const isPost = path.startsWith("/posts/") || path.includes("/feed/update/");
    if (!isPost) return null;

    const decodedHref = decodeURIComponent(href);
    const urnMatch = decodedHref.match(/urn:li:(activity|share|ugcPost):([A-Za-z0-9_-]+)/i);
    const iframeSrc = urnMatch
      ? `https://www.linkedin.com/embed/feed/update/urn:li:${urnMatch[1]}:${urnMatch[2]}`
      : activityId
        ? `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}`
        : null;

    return { provider: "linkedin", url: href, iframeSrc };
  }

  return null;
}

export function socialProviderLabel(provider: SocialProvider): string {
  switch (provider) {
    case "x":
      return "X / Twitter";
    case "facebook":
      return "Facebook";
    case "linkedin":
      return "LinkedIn";
  }
}

export function getSocialEmbedFallbackSize(provider: SocialProvider): SocialEmbedSize {
  return SOCIAL_EMBED_SIZE[provider];
}
