export type SocialProvider = "x" | "facebook" | "linkedin";
export const SOCIAL_NOTE_PREFIX = "nyabag-social:";

export type SocialEmbed =
  | { provider: "x"; url: string; statusId: string }
  | { provider: "facebook"; url: string }
  | { provider: "linkedin"; url: string; iframeSrc: string | null };

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

  if (hostname === "x.com" || hostname === "twitter.com") {
    const statusId = url.pathname.match(/\/status(?:es)?\/(\d+)/)?.[1];
    if (!statusId) return null;
    return { provider: "x", url: href.replace("https://x.com/", "https://twitter.com/"), statusId };
  }

  if (hostname === "facebook.com" || hostname === "m.facebook.com" || hostname === "web.facebook.com") {
    const path = url.pathname.toLowerCase();
    const isPost =
      path.includes("/posts/") ||
      path.includes("/permalink.php") ||
      path.includes("/photo.php") ||
      path.includes("/videos/") ||
      path.includes("/story.php");
    if (!isPost) return null;
    return { provider: "facebook", url: href };
  }

  if (hostname === "linkedin.com") {
    const path = url.pathname.toLowerCase();
    const activityId = url.pathname.match(/activity-(\d+)/)?.[1];
    const isPost = path.startsWith("/posts/") || path.includes("/feed/update/");
    if (!isPost) return null;

    const urnMatch = href.match(/urn%3Ali%3A(activity|share|ugcPost)%3A([A-Za-z0-9_-]+)/i);
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
