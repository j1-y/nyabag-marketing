#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/bookmark-search-fixtures.json"), "utf8"));
const GENERIC_TERMS = new Set(["design", "website", "modern", "card", "cards", "landing", "page", "saas"]);

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostname(url) {
  return normalize(url).split("/")[0];
}

function tokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !GENERIC_TERMS.has(token));
}

function documentText(bookmark) {
  return [
    `Retrieval schema: bookmark-v2`,
    `Title: ${bookmark.title}`,
    `Domain: ${hostname(bookmark.url)}`,
    `User tags: ${bookmark.tags.join(", ")}`,
    `User note: ${bookmark.note}`,
    `Save reason: ${bookmark.save_reason}`,
    `Page type: ${bookmark.page_type}`,
    `Layout structure: ${bookmark.patterns.join(", ")}`,
    `Visual evidence: ${bookmark.visual.join(", ")}`,
  ].join("\n");
}

function lexicalCandidates(query) {
  const q = normalize(query);
  if (!q || GENERIC_TERMS.has(q)) return [];

  return fixtures
    .map((bookmark) => {
      const title = normalize(bookmark.title);
      const domain = hostname(bookmark.url);
      const tags = bookmark.tags.map(normalize);
      const haystack = normalize([bookmark.title, domain, ...bookmark.tags, bookmark.note, ...bookmark.patterns].join(" "));
      const exact =
        (title === q ? 1 : 0) +
        (domain === q ? 0.95 : 0) +
        (tags.includes(q) ? 0.9 : 0) +
        (title.startsWith(q) ? 0.35 : 0) +
        (domain.startsWith(q) ? 0.3 : 0);
      const lexical = haystack.includes(q) ? 0.35 : 0;
      const score = Math.min(1, exact + lexical);
      const reasons = [
        title === q ? "Exact title" : "",
        domain === q ? "Exact domain" : "",
        tags.includes(q) ? "Exact tag" : "",
        title.startsWith(q) ? "Title prefix" : "",
        lexical ? "Keyword evidence" : "",
      ].filter(Boolean).slice(0, 3);

      return { bookmarkId: bookmark.id, lexicalScore: score, exactMatchScore: Math.min(1, exact), reasons };
    })
    .filter((candidate) => candidate.lexicalScore >= 0.08)
    .sort((a, b) => b.exactMatchScore - a.exactMatchScore || b.lexicalScore - a.lexicalScore)
    .map((candidate, index) => ({ ...candidate, lexicalRank: index }));
}

function semanticCandidates(query) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];

  return fixtures
    .map((bookmark) => {
      const docTokens = new Set(tokens(documentText(bookmark)));
      const matches = queryTokens.filter((token) => docTokens.has(token));
      const similarity = matches.length / queryTokens.length;
      return {
        bookmarkId: bookmark.id,
        semanticSimilarity: similarity,
        reasons: matches.map((match) => `${match} evidence`).slice(0, 3),
      };
    })
    .filter((candidate) => candidate.semanticSimilarity >= 0.42)
    .sort((a, b) => b.semanticSimilarity - a.semanticSimilarity)
    .map((candidate, index) => ({ ...candidate, semanticRank: index }));
}

function fuse(query) {
  const byId = new Map();
  const candidates = [...lexicalCandidates(query), ...semanticCandidates(query)];

  for (const candidate of candidates) {
    const current =
      byId.get(candidate.bookmarkId) ??
      {
        bookmarkId: candidate.bookmarkId,
        lexicalScore: 0,
        semanticSimilarity: 0,
        exactMatchScore: 0,
        searchScore: 0,
        reasons: [],
      };
    current.lexicalScore = Math.max(current.lexicalScore, candidate.lexicalScore ?? 0);
    current.semanticSimilarity = Math.max(current.semanticSimilarity, candidate.semanticSimilarity ?? 0);
    current.exactMatchScore = Math.max(current.exactMatchScore, candidate.exactMatchScore ?? 0);
    current.searchScore += (candidate.lexicalRank === undefined ? 0 : 1.25 / (50 + candidate.lexicalRank + 1));
    current.searchScore += (candidate.semanticRank === undefined ? 0 : 1 / (50 + candidate.semanticRank + 1));
    current.searchScore += current.lexicalScore * 0.35 + current.semanticSimilarity * 0.22 + current.exactMatchScore * 1.6;
    current.reasons = Array.from(new Set([...current.reasons, ...(candidate.reasons ?? [])])).slice(0, 3);
    byId.set(candidate.bookmarkId, current);
  }

  return Array.from(byId.values())
    .filter((candidate) => candidate.exactMatchScore > 0 || candidate.lexicalScore >= 0.08 || candidate.semanticSimilarity >= 0.42)
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, 12);
}

function ids(results) {
  return results.map((result) => result.bookmarkId);
}

assert.equal(ids(fuse("Northstar Analytics Dashboard"))[0], "dark-dashboard", "exact title should dominate");
assert.equal(ids(fuse("pricing.brightplan.example.com"))[0], "light-pricing", "exact domain should dominate");
assert.equal(ids(fuse("saved-pricing"))[0], "light-pricing", "exact user tag should dominate");
assert.equal(ids(fuse("bento grid"))[0], "bento-saas", "bento grid should find SaaS bento page");
assert.equal(ids(fuse("pricing toggle"))[0], "light-pricing", "pricing toggle should find pricing page");
assert.equal(ids(fuse("dashboard sidebar"))[0], "dark-dashboard", "dashboard sidebar should find dashboard page");
assert.equal(ids(fuse("serif portfolio"))[0], "editorial-portfolio", "serif portfolio should find editorial portfolio");
assert.deepEqual(ids(fuse("zzqx unmatched memory")), [], "no-match query should not be padded");

for (const generic of ["design", "website", "modern", "card"]) {
  assert.ok(fuse(generic).length <= 1, `generic term "${generic}" should not flood results`);
}

for (const bookmark of fixtures) {
  const text = documentText(bookmark);
  assert.ok(!text.includes("https://"), "retrieval text should avoid full URLs");
  assert.ok(!/#[0-9a-f]{6}/i.test(text), "retrieval text should avoid raw HEX-heavy palettes");
}

for (const result of fuse("dark dashboard sidebar")) {
  assert.ok(result.reasons.length <= 3, "match reasons must stay concise");
}

assert.equal(normalize("https://www.Example.com/path"), "example.com path", "query normalization should strip protocol and www");

console.log("bookmark search evaluation passed");
