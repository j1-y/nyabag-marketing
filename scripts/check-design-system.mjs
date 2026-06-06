import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const roots = [
  "src/app/app",
  "src/app/login",
  "src/app/signup",
  "src/components",
];

const excludedPathParts = [
  "src/components/site/",
];

const appCssFiles = new Set(["src/app/globals.css"]);
const fileExtensions = /\.(?:css|tsx|ts|jsx|js)$/;
const spacingPrefixes = new Set([
  "p", "px", "py", "pt", "pr", "pb", "pl",
  "m", "mx", "my", "mt", "mr", "mb", "ml",
  "gap", "gap-x", "gap-y",
  "inset", "inset-x", "inset-y", "top", "right", "bottom", "left",
]);

function listFiles(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      const normalized = path.replaceAll("\\", "/");
      if (excludedPathParts.some((part) => normalized.includes(part))) continue;
      if (entry.isDirectory()) {
        results.push(...listFiles(path));
        continue;
      }
      if (entry.isFile() && fileExtensions.test(path)) results.push(path);
    }
  } catch {
    return results;
  }
  return results;
}

function isMultipleOfEight(value) {
  return Number.isFinite(value) && Math.abs(value % 8) < 0.001;
}

function tailwindSpacingToPx(raw) {
  if (raw.includes("/") || raw.includes("[") || raw === "auto" || raw === "px") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value * 4;
}

function parseInlineSpacingValue(raw) {
  const trimmed = raw.trim();
  if (trimmed === "0") return [0];
  const quoted = trimmed.match(/^["'`]([^"'`]+)["'`]$/)?.[1] ?? trimmed;
  return quoted
    .split(/\s+/)
    .map((part) => {
      if (part === "0") return 0;
      const px = part.match(/^(-?\d+(?:\.\d+)?)px$/);
      if (px) return Number(px[1]);
      const numeric = part.match(/^-?\d+(?:\.\d+)?$/);
      if (numeric) return Number(part);
      return null;
    })
    .filter((value) => value !== null);
}

function isAllowedSpacingLine(line) {
  return [
    "fontSize",
    "lineHeight",
    "contextMenu.",
    "translate(",
    "transform",
    "zIndex",
    "viewport",
    "note.x",
    "note.y",
    "width:",
    "height:",
    "media",
    "iframe",
    "video",
    "img",
  ].some((token) => line.includes(token));
}

function checkRadius(file, line, lineNumber, failures) {
  for (const match of line.matchAll(/\bborder-radius:\s*([^;]+);/g)) {
    const value = match[1].trim();
    if (value === "0" || value === "0px" || value === "10px" || value === "var(--radius)") continue;
    failures.push(`${file}:${lineNumber}: border-radius must be 0 or 10px, found ${value}`);
  }

  for (const match of line.matchAll(/\brounded-([^\s"'`]+)/g)) {
    const token = match[0];
    if (token === "rounded-[10px]" || token === "rounded-[0px]") continue;
    failures.push(`${file}:${lineNumber}: use rounded-[10px] for app UI, found ${token}`);
  }

  for (const match of line.matchAll(/\bborderRadius:\s*([^,}]+)/g)) {
    const value = match[1].trim();
    if (value === "10" || value === "0" || value === "\"10px\"" || value === "'10px'") continue;
    failures.push(`${file}:${lineNumber}: inline borderRadius must be 0 or 10, found ${value}`);
  }
}

function checkTailwindSpacing(file, line, lineNumber, failures) {
  if (file.endsWith(".css")) return;
  if (isAllowedSpacingLine(line)) return;
  for (const match of line.matchAll(/(?:^|\s)(-?)([a-z-]+)-([0-9.]+|auto|px|\[[^\]]+\]|[0-9]+\/[0-9]+)\b/g)) {
    const [, negative, prefix, rawValue] = match;
    if (!spacingPrefixes.has(prefix)) continue;
    if (line[(match.index ?? 0) + match[0].length] === "/") continue;
    const px = tailwindSpacingToPx(rawValue);
    if (px === null) continue;
    const signedPx = negative ? -px : px;
    if (!isMultipleOfEight(signedPx)) {
      failures.push(`${file}:${lineNumber}: ${prefix}-${rawValue} is ${signedPx}px; app spacing must use 8px multiples`);
    }
  }
}

function checkInlineSpacing(file, line, lineNumber, failures) {
  if (file.endsWith(".css")) return;
  if (isAllowedSpacingLine(line)) return;
  for (const match of line.matchAll(/(?:^|[,{]\s*)(padding|paddingLeft|paddingRight|paddingTop|paddingBottom|margin|marginLeft|marginRight|marginTop|marginBottom|gap|top|right|bottom|left):\s*([^,}]+)/g)) {
    const [, property, raw] = match;
    const values = parseInlineSpacingValue(raw);
    if (values.length === 0) continue;
    for (const value of values) {
      if (!isMultipleOfEight(value)) {
        failures.push(`${file}:${lineNumber}: inline ${property} value ${raw.trim()} must use 8px multiples`);
        break;
      }
    }
  }
}

const failures = [];
const files = [
  ...roots.flatMap(listFiles),
  ...Array.from(appCssFiles),
].map((file) => file.replaceAll("\\", "/"));

for (const filePath of files) {
  const normalized = relative(process.cwd(), filePath).replaceAll("\\", "/");
  const source = readFileSync(filePath, "utf8");
  source.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    checkRadius(normalized, line, lineNumber, failures);
    checkTailwindSpacing(normalized, line, lineNumber, failures);
    checkInlineSpacing(normalized, line, lineNumber, failures);
  });
}

if (failures.length > 0) {
  console.error("Nyabag design-system check failed.");
  console.error(failures.slice(0, 100).join("\n"));
  if (failures.length > 100) console.error(`...and ${failures.length - 100} more`);
  process.exit(1);
}

console.log("Design-system check passed.");
