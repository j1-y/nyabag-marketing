export const NYABAG_CANONICAL_BLACK = "#212121";
export const DEFAULT_NOTE_COLOR = "#FFF9C4";
export const DEFAULT_SECTION_COLOR = "#FFFFFF";

export const NOTE_COLORS_REQUIRING_LIGHT_TEXT = ["#EF4056", "#B23ACB"] as const;

export const DESIGN_DB: Record<string, { palette: string[]; fonts: string[] }> = {
  "dribbble.com": { palette: ["#EA4C89", "#F7C5DA", "#17181A", "#FFFFFF", "#444444"], fonts: ["Graphik", "Tiempos Text"] },
  "figma.com": { palette: ["#1ABCFE", "#0ACF83", "#FF7262", "#A259FF", "#F24E1E"], fonts: ["Inter", "Figma Sans"] },
  "behance.net": { palette: ["#0057FF", "#FFFFFF", "#111111", "#99BBFF", "#1769FF"], fonts: ["Adobe Clean", "Helvetica Neue"] },
  "awwwards.com": { palette: ["#F2F2F2", "#000000", "#FFD600", "#333333", "#FFFFFF"], fonts: ["Suisse Int'l", "ABC Monument Grotesk"] },
  "github.com": { palette: ["#24292E", "#F6F8FA", "#0366D6", "#28A745", "#6F42C1"], fonts: ["Mona Sans", "Hubot Sans"] },
  "notion.so": { palette: ["#FFFFFF", "#000000", "#E9E9E7", "#2EAADC", "#9B59B6"], fonts: ["ui-sans-serif", "Georgia"] },
  "stripe.com": { palette: ["#635BFF", "#0A2540", "#FFFFFF", "#00D4FF", "#425466"], fonts: ["Sohne", "system-ui"] },
  "linear.app": { palette: ["#5E6AD2", "#FFFFFF", "#111111", "#F2F2F2", "#818CF8"], fonts: ["Inter", "system-ui"] },
  "vercel.com": { palette: ["#000000", "#FFFFFF", "#888888", "#F5F5F5", "#0070F3"], fonts: ["Geist", "Geist Mono"] },
  "tailwindcss.com": { palette: ["#06B6D4", "#0F172A", "#FFFFFF", "#38BDF8", "#7DD3FC"], fonts: ["Inter", "JetBrains Mono"] },
  "apple.com": { palette: ["#FFFFFF", "#1D1D1F", "#06C", "#F5F5F7", "#515154"], fonts: ["SF Pro Display", "SF Pro Text"] },
  "google.com": { palette: ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#FFFFFF"], fonts: ["Google Sans", "Roboto"] },
  "spotify.com": { palette: ["#1DB954", "#191414", "#FFFFFF", "#B3B3B3", "#535353"], fonts: ["Circular", "Helvetica Neue"] },
  "airbnb.com": { palette: ["#FF5A5F", "#FFFFFF", "#484848", "#767676", "#00A699"], fonts: ["Cereal", "Circular"] },
  "framer.com": { palette: ["#0055FF", "#0A0A0A", "#FFFFFF", "#9BAEFF", "#F5F5F5"], fonts: ["Fraunces", "Inter"] },
  "webflow.com": { palette: ["#146EF5", "#1A1B1F", "#FFFFFF", "#E8F0FE", "#4353FF"], fonts: ["Gilroy", "Inter"] },
  "pinterest.com": { palette: ["#E60023", "#FFFFFF", "#111111", "#FF4500", "#F1F1F1"], fonts: ["Helvetica Neue", "Arial"] },
  "twitter.com": { palette: ["#1DA1F2", "#FFFFFF", "#14171A", "#657786", "#AAB8C2"], fonts: ["Chirp", "system-ui"] },
  "x.com": { palette: ["#1DA1F2", "#FFFFFF", "#14171A", "#657786", "#AAB8C2"], fonts: ["Chirp", "system-ui"] },
  "youtube.com": { palette: ["#FF0000", "#FFFFFF", "#282828", "#606060", "#AAAAAA"], fonts: ["YouTube Sans", "Roboto"] },
  "netflix.com": { palette: ["#E50914", "#141414", "#FFFFFF", "#B81D24", "#F5F5F1"], fonts: ["Netflix Sans", "Helvetica Neue"] },
  "medium.com": { palette: ["#1A8917", "#FFFFFF", "#242424", "#6B6B6B", "#FFC017"], fonts: ["Charter", "GT Super Display"] },
  "anthropic.com": { palette: ["#D4A27F", "#CC785C", "#1A1A1A", "#FFFFFF", "#F5F0E8"], fonts: ["Tiempos Text", "Söhne"] },
  "openai.com": { palette: ["#10A37F", "#FFFFFF", "#202123", "#343541", "#ECECF1"], fonts: ["Söhne", "ui-sans-serif"] },
  "producthunt.com": { palette: ["#DA552F", "#FFFFFF", "#2D2D2D", "#FF6154", "#F6F6F6"], fonts: ["Lato", "Open Sans"] },
  "unsplash.com": { palette: ["#111111", "#FFFFFF", "#767676", "#EDEDED", "#000000"], fonts: ["Untitled Sans", "system-ui"] },
  "lottiefiles.com": { palette: ["#00C1A4", "#FFFFFF", "#1A1A2E", "#7B2FF7", "#F5F5F5"], fonts: ["Inter", "system-ui"] },
  "shadcn.com": { palette: ["#09090B", "#FAFAFA", "#3F3F46", "#A1A1AA", "#18181B"], fonts: ["Geist", "Geist Mono"] },
};

export const FALLBACK_PALETTES = [
  ["#3B82F6", "#EFF6FF", "#1E3A5F", "#93C5FD", "#DBEAFE"],
  ["#8B5CF6", "#EDE9FE", "#4C1D95", "#C4B5FD", "#DDD6FE"],
  ["#10B981", "#ECFDF5", "#064E3B", "#6EE7B7", "#D1FAE5"],
  ["#F59E0B", "#FFFBEB", "#78350F", "#FCD34D", "#FEF3C7"],
  ["#EF4444", "#FEF2F2", "#7F1D1D", "#FCA5A5", "#FEE2E2"],
  ["#EC4899", "#FDF2F8", "#831843", "#F9A8D4", "#FCE7F3"],
  ["#14B8A6", "#F0FDFA", "#134E4A", "#5EEAD4", "#CCFBF1"],
  ["#F97316", "#FFF7ED", "#7C2D12", "#FDBA74", "#FED7AA"],
] as const;

export const TAG_COLORS = [
  "#7c6fff", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#84cc16",
] as const;

export const LANDING_DEMO_PALETTES = {
  linear: ["#1a1a2e", "#16213e", "#5865f2", "#e2e8f0", "#888"],
  rauno: ["#0d0d0d", "#f5f5f5", "#888", "#333", "#ccc"],
  vercel: ["#0f1117", "#5865f2", "#ededed", "#444", "#1c1f26"],
  stripe: ["#0a2540", "#635bff", "#00d4ff", "#f6f9fc", "#425466"],
  figma: ["#1e1e1e", "#ff7262", "#a259ff", "#1abcfe", "#0acf83"],
  mobbin: ["#000", "#fff", "#aaa", "#222", "#555"],
} as const;
