// ─── Design DB ───────────────────────────────────────────────
export const DESIGN_DB: Record<string, { palette: string[]; fonts: string[] }> = {
  "dribbble.com":    { palette: ["#EA4C89","#F7C5DA","#17181A","#FFFFFF","#444444"], fonts: ["Graphik","Tiempos Text"] },
  "figma.com":       { palette: ["#1ABCFE","#0ACF83","#FF7262","#A259FF","#F24E1E"], fonts: ["Inter","Figma Sans"] },
  "behance.net":     { palette: ["#0057FF","#FFFFFF","#111111","#99BBFF","#1769FF"], fonts: ["Adobe Clean","Helvetica Neue"] },
  "awwwards.com":    { palette: ["#F2F2F2","#000000","#FFD600","#333333","#FFFFFF"], fonts: ["Suisse Int'l","ABC Monument Grotesk"] },
  "github.com":      { palette: ["#24292E","#F6F8FA","#0366D6","#28A745","#6F42C1"], fonts: ["Mona Sans","Hubot Sans"] },
  "notion.so":       { palette: ["#FFFFFF","#000000","#E9E9E7","#2EAADC","#9B59B6"], fonts: ["ui-sans-serif","Georgia"] },
  "stripe.com":      { palette: ["#635BFF","#0A2540","#FFFFFF","#00D4FF","#425466"], fonts: ["Sohne","system-ui"] },
  "linear.app":      { palette: ["#5E6AD2","#FFFFFF","#111111","#F2F2F2","#818CF8"], fonts: ["Inter","system-ui"] },
  "vercel.com":      { palette: ["#000000","#FFFFFF","#888888","#F5F5F5","#0070F3"], fonts: ["Geist","Geist Mono"] },
  "tailwindcss.com": { palette: ["#06B6D4","#0F172A","#FFFFFF","#38BDF8","#7DD3FC"], fonts: ["Inter","JetBrains Mono"] },
  "apple.com":       { palette: ["#FFFFFF","#1D1D1F","#06C","#F5F5F7","#515154"],    fonts: ["SF Pro Display","SF Pro Text"] },
  "google.com":      { palette: ["#4285F4","#34A853","#FBBC05","#EA4335","#FFFFFF"], fonts: ["Google Sans","Roboto"] },
  "spotify.com":     { palette: ["#1DB954","#191414","#FFFFFF","#B3B3B3","#535353"], fonts: ["Circular","Helvetica Neue"] },
  "airbnb.com":      { palette: ["#FF5A5F","#FFFFFF","#484848","#767676","#00A699"], fonts: ["Cereal","Circular"] },
  "framer.com":      { palette: ["#0055FF","#0A0A0A","#FFFFFF","#9BAEFF","#F5F5F5"], fonts: ["Fraunces","Inter"] },
  "webflow.com":     { palette: ["#146EF5","#1A1B1F","#FFFFFF","#E8F0FE","#4353FF"], fonts: ["Gilroy","Inter"] },
  "pinterest.com":   { palette: ["#E60023","#FFFFFF","#111111","#FF4500","#F1F1F1"], fonts: ["Helvetica Neue","Arial"] },
  "twitter.com":     { palette: ["#1DA1F2","#FFFFFF","#14171A","#657786","#AAB8C2"], fonts: ["Chirp","system-ui"] },
  "x.com":           { palette: ["#1DA1F2","#FFFFFF","#14171A","#657786","#AAB8C2"], fonts: ["Chirp","system-ui"] },
  "youtube.com":     { palette: ["#FF0000","#FFFFFF","#282828","#606060","#AAAAAA"], fonts: ["YouTube Sans","Roboto"] },
  "netflix.com":     { palette: ["#E50914","#141414","#FFFFFF","#B81D24","#F5F5F1"], fonts: ["Netflix Sans","Helvetica Neue"] },
  "medium.com":      { palette: ["#1A8917","#FFFFFF","#242424","#6B6B6B","#FFC017"], fonts: ["Charter","GT Super Display"] },
  "anthropic.com":   { palette: ["#D4A27F","#CC785C","#1A1A1A","#FFFFFF","#F5F0E8"], fonts: ["Tiempos Text","Söhne"] },
  "openai.com":      { palette: ["#10A37F","#FFFFFF","#202123","#343541","#ECECF1"], fonts: ["Söhne","ui-sans-serif"] },
  "producthunt.com": { palette: ["#DA552F","#FFFFFF","#2D2D2D","#FF6154","#F6F6F6"], fonts: ["Lato","Open Sans"] },
  "unsplash.com":    { palette: ["#111111","#FFFFFF","#767676","#EDEDED","#000000"], fonts: ["Untitled Sans","system-ui"] },
  "lottiefiles.com": { palette: ["#00C1A4","#FFFFFF","#1A1A2E","#7B2FF7","#F5F5F5"], fonts: ["Inter","system-ui"] },
  "shadcn.com":      { palette: ["#09090B","#FAFAFA","#3F3F46","#A1A1AA","#18181B"], fonts: ["Geist","Geist Mono"] },
};

const FALLBACK_PALETTES = [
  ["#3B82F6","#EFF6FF","#1E3A5F","#93C5FD","#DBEAFE"],
  ["#8B5CF6","#EDE9FE","#4C1D95","#C4B5FD","#DDD6FE"],
  ["#10B981","#ECFDF5","#064E3B","#6EE7B7","#D1FAE5"],
  ["#F59E0B","#FFFBEB","#78350F","#FCD34D","#FEF3C7"],
  ["#EF4444","#FEF2F2","#7F1D1D","#FCA5A5","#FEE2E2"],
  ["#EC4899","#FDF2F8","#831843","#F9A8D4","#FCE7F3"],
  ["#14B8A6","#F0FDFA","#134E4A","#5EEAD4","#CCFBF1"],
  ["#F97316","#FFF7ED","#7C2D12","#FDBA74","#FED7AA"],
];

const FALLBACK_FONTS = [
  ["Inter","Georgia"], ["Roboto","Playfair Display"], ["Poppins","Lora"],
  ["Lato","Merriweather"], ["Nunito","Source Serif Pro"],
  ["Outfit","DM Serif Display"], ["Plus Jakarta Sans","EB Garamond"],
];

export const TAG_COLORS = [
  "#7c6fff","#22c55e","#f59e0b","#ef4444","#3b82f6",
  "#ec4899","#14b8a6","#f97316","#8b5cf6","#84cc16",
];

export const SCREENSHOT_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return ""; }
}

export function getDesignData(url: string): { palette: string[]; fonts: string[] } {
  const domain = getDomain(url);
  if (DESIGN_DB[domain]) return DESIGN_DB[domain];
  const key = Object.keys(DESIGN_DB).find(
    (k) => domain.includes(k) || k.includes(domain)
  );
  if (key) return DESIGN_DB[key];
  const seed = domain.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    palette: FALLBACK_PALETTES[seed % FALLBACK_PALETTES.length],
    fonts: FALLBACK_FONTS[seed % FALLBACK_FONTS.length],
  };
}

export type MicrolinkPreviewData = {
  palette: string[] | null;
  screenshotUrl: string | null;
  refreshedAt: string;
};

function normalizePalette(palette: unknown): string[] | null {
  if (!Array.isArray(palette)) return null;

  const colors = palette
    .filter((color): color is string => /^#[0-9A-Fa-f]{6}$/.test(color))
    .map((color) => color.toUpperCase());

  const unique = Array.from(new Set(colors)).slice(0, 8);
  return unique.length ? unique : null;
}

export async function getMicrolinkPreviewData(url: string): Promise<MicrolinkPreviewData | null> {
  try {
    const endpoint = new URL("https://api.microlink.io/");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("screenshot", "true");
    endpoint.searchParams.set("fullPage", "true");
    endpoint.searchParams.set("palette", "true");
    endpoint.searchParams.set("filter", "screenshot");

    const response = await fetch(endpoint.toString(), {
      cache: "no-store",
    });
    if (!response.ok) return null;

    const json = await response.json();
    const screenshotUrl = json?.data?.screenshot?.url;

    return {
      palette: normalizePalette(json?.data?.screenshot?.palette),
      screenshotUrl: typeof screenshotUrl === "string" ? screenshotUrl : null,
      refreshedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getScreenshotPalette(url: string): Promise<string[] | null> {
  return (await getMicrolinkPreviewData(url))?.palette ?? null;
}

export function isScreenshotStale(refreshedAt: string | null | undefined): boolean {
  if (!refreshedAt) return true;
  const refreshedTime = new Date(refreshedAt).getTime();
  if (!Number.isFinite(refreshedTime)) return true;
  return Date.now() - refreshedTime >= SCREENSHOT_REFRESH_INTERVAL_MS;
}

export function getTagColor(tag: string): string {
  const seed = tag.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return TAG_COLORS[seed % TAG_COLORS.length];
}

export function getFaviconUrl(url: string): string | null {
  try {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  } catch { return null; }
}

export function getScreenshotUrl(url: string): string {
  return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&fullPage=true&meta=false&embed=screenshot.url`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}
