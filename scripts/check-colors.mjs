import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src/app", "src/components", "src/lib"];
const allowlistedFiles = new Set([
  "src/app/globals.css",
  "src/lib/content-colors.ts",
]);

const fileExtensions = /\.(?:css|tsx|ts|jsx|js)$/;
const rawColorPattern = /#[0-9A-Fa-f]{3,8}\b|rgba?\(\s*\d|hsla?\(\s*\d|\b(?:black|white)\b/g;

function listFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(path));
      continue;
    }
    if (entry.isFile() && fileExtensions.test(path)) results.push(path);
  }
  return results;
}

function isAllowedMatch(file, line, match, index) {
  const normalizedFile = file.replaceAll("\\", "/");
  if (allowlistedFiles.has(normalizedFile)) return true;
  const before = line[index - 1] ?? "";
  const after = line[index + match.length] ?? "";
  if (/[-_a-zA-Z0-9]/.test(before) || /[-_a-zA-Z0-9]/.test(after)) return true;
  if (match === "black" && /mask-image|-webkit-mask-image/.test(line)) return true;
  if (match === "black" && /transparent/.test(line)) return true;
  if (match === "black" && /^\s*black\s+\d/.test(line)) return true;
  if (match === "white" && /white-space/.test(line)) return true;
  if (line.includes("var(--black)") || line.includes("var(--white)")) return true;
  return false;
}

const failures = [];

for (const root of roots) {
  for (const file of listFiles(root)) {
    const normalizedFile = relative(process.cwd(), file).replaceAll("\\", "/");
    const source = readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const match of line.matchAll(rawColorPattern)) {
        const value = match[0];
        if (isAllowedMatch(normalizedFile, line, value, match.index ?? 0)) continue;
        failures.push(`${normalizedFile}:${index + 1}: ${value}`);
      }
    });
  }
}

if (failures.length > 0) {
  console.error("Raw UI colors found. Use globals.css tokens or move content colors into src/lib/content-colors.ts.");
  console.error(failures.slice(0, 80).join("\n"));
  if (failures.length > 80) console.error(`...and ${failures.length - 80} more`);
  process.exit(1);
}

console.log("Color token check passed.");
