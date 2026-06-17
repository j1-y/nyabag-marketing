import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const fixturePath = path.join(root, "tests", "visual-search-fixtures.json");

const taxonomy = [
  ["hero", ["hero", "above fold"]],
  ["search_bar", ["search bar", "search input", "search box", "input bar"]],
  ["logo_strip", ["logo strip", "company logos", "customer logos", "logos", "trusted by", "partners"]],
  ["dark_ui", ["dark", "black", "charcoal", "midnight"]],
  ["dashboard", ["dashboard", "analytics", "metrics"]],
  ["sidebar", ["sidebar", "side nav"]],
  ["metric_card", ["metric card", "metric cards", "stat cards", "stats"]],
  ["pricing", ["pricing", "plans", "monthly", "yearly"]],
  ["toggle", ["toggle", "monthly yearly", "segmented control", "switch"]],
];

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseQuery(query) {
  const normalized = normalize(query);
  return taxonomy
    .filter(([, terms]) => terms.some((term) => normalized.includes(normalize(term))))
    .map(([concept]) => concept);
}

function scoreFixture(fixture) {
  const parsed = parseQuery(fixture.query);
  const mustHave = fixture.must_have ?? [];
  const matched = mustHave.filter((concept) => parsed.includes(concept));
  const missing = mustHave.filter((concept) => !parsed.includes(concept));

  return {
    query: fixture.query,
    parsed,
    matched,
    missing,
    pass: missing.length === 0,
  };
}

const fixtures = JSON.parse(await fs.readFile(fixturePath, "utf8"));
const results = fixtures.map(scoreFixture);
const passed = results.filter((result) => result.pass).length;

for (const result of results) {
  console.log(`\nQuery: ${result.query}`);
  console.log(`Parsed concepts: ${result.parsed.join(", ") || "(none)"}`);
  console.log(`Matched must-have: ${result.matched.join(", ") || "(none)"}`);
  console.log(`Missing must-have: ${result.missing.join(", ") || "(none)"}`);
  console.log(`Status: ${result.pass ? "PASS" : "FAIL"}`);
}

console.log(`\nSummary: ${passed}/${results.length} parser fixture checks passed.`);

if (passed !== results.length) {
  process.exitCode = 1;
}

