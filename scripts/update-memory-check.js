#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const ARCHITECTURE_DOC = path.join(ROOT, "docs", "NYABAG_TECHNICAL_DOCUMENTATION.md");
const MEMORY_DOCS = [
  path.join(ROOT, ".ai-memory", "architecture.md"),
  path.join(ROOT, ".ai-memory", "feature-registry.md"),
  path.join(ROOT, ".ai-memory", "roadmap.md"),
  path.join(ROOT, ".ai-memory", "workflows.md"),
];

const ROUTE_MARKERS = new Set(["page", "layout", "loading", "route", "template", "error", "not-found", "default"]);
const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(fullPath));
      continue;
    }
    if (entry.isFile()) results.push(fullPath);
  }
  return results;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll("\\", "/");
}

function isRouteFile(filePath) {
  if (!FILE_EXTENSIONS.has(path.extname(filePath))) return false;
  const base = path.basename(filePath).replace(/\.(ts|tsx|js|jsx|mjs)$/, "");
  return ROUTE_MARKERS.has(base);
}

function isComponentFile(filePath) {
  return rel(filePath).startsWith("src/components/") && FILE_EXTENSIONS.has(path.extname(filePath));
}

function isHookFile(filePath) {
  return rel(filePath).startsWith("src/hooks/") && FILE_EXTENSIONS.has(path.extname(filePath));
}

function isServerActionFile(filePath) {
  const normalized = rel(filePath);
  if (!normalized.startsWith("src/lib/")) return false;
  if (!FILE_EXTENSIONS.has(path.extname(filePath))) return false;
  if (/actions?\.(ts|tsx|js|jsx|mjs)$/.test(normalized) || /-actions\.(ts|tsx|js|jsx|mjs)$/.test(normalized)) return true;
  const source = fs.readFileSync(filePath, "utf8");
  return /^["']use server["'];/m.test(source) || /^\s*["']use server["'];/m.test(source);
}

function readDocText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function reportCategory(title, files, docText) {
  if (files.length === 0) return;

  console.log(`${title}: ${files.length}`);
  const unmentioned = [];
  for (const filePath of files) {
    const value = rel(filePath);
    if (!docText || !docText.includes(value)) unmentioned.push(value);
  }

  for (const value of files.slice(0, 10).map(rel)) {
    console.log(`- ${value}`);
  }
  if (files.length > 10) {
    console.log(`- ...and ${files.length - 10} more`);
  }

  if (unmentioned.length > 0) {
    console.log(`  reminder: architecture documentation may need updating for ${unmentioned.length} ${title.toLowerCase()}`);
  }
}

const routeFiles = listFiles(path.join(ROOT, "src", "app")).filter(isRouteFile);
const componentFiles = listFiles(path.join(ROOT, "src", "components")).filter(isComponentFile);
const hookFiles = listFiles(path.join(ROOT, "src", "hooks")).filter(isHookFile);
const serverActionFiles = listFiles(path.join(ROOT, "src", "lib")).filter(isServerActionFile);

const architectureText = readDocText(ARCHITECTURE_DOC);
const featureRegistryText = readDocText(MEMORY_DOCS[1]);
const combinedDocs = [architectureText, featureRegistryText, ...MEMORY_DOCS.map(readDocText)].join("\n");

console.log("Nyabag memory check");
console.log("This script only prints reminders; it does not write files.");
console.log("");

reportCategory("Route files", routeFiles, architectureText);
console.log("");
reportCategory("Component files", componentFiles, combinedDocs);
console.log("");
reportCategory("Hook files", hookFiles, combinedDocs);
console.log("");
reportCategory("Server action files", serverActionFiles, combinedDocs);

if (routeFiles.length || componentFiles.length || hookFiles.length || serverActionFiles.length) {
  console.log("");
  console.log("Reminder: review .ai-memory/architecture.md, .ai-memory/feature-registry.md, and docs/NYABAG_TECHNICAL_DOCUMENTATION.md if any of the listed files are new or materially changed.");
}
