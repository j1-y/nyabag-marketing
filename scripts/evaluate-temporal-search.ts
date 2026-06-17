import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { parseBookmarkSearchQuery } from "../src/lib/bookmark-search/temporal-query";

const KOLKATA_NOW = new Date("2026-06-17T18:30:00.000Z");
const NEW_YORK_DST_NOW = new Date("2026-03-08T12:00:00.000Z");

function parse(query: string, timeZone = "Asia/Kolkata", now = KOLKATA_NOW) {
  return parseBookmarkSearchQuery({ query, timeZone, locale: "en-US", now });
}

function expectRange(query: string, label: string, startUtc: string, endUtc: string) {
  const result = parse(query);
  assert.equal(result.temporal?.kind, "range", `${query} should parse as range`);
  assert.equal(result.temporal?.label, label);
  assert.equal(result.temporal?.startUtc, startUtc);
  assert.equal(result.temporal?.endUtc, endUtc);
}

expectRange("bookmarks I saved today", "Today", "2026-06-17T18:30:00.000Z", "2026-06-18T18:30:00.000Z");
expectRange("things I saved yesterday", "Yesterday", "2026-06-16T18:30:00.000Z", "2026-06-17T18:30:00.000Z");
expectRange("bookmarks from this week", "This week", "2026-06-14T18:30:00.000Z", "2026-06-21T18:30:00.000Z");
expectRange("bookmarks from last week", "Last week", "2026-06-07T18:30:00.000Z", "2026-06-14T18:30:00.000Z");
expectRange("references saved this month", "This month", "2026-05-31T18:30:00.000Z", "2026-06-30T18:30:00.000Z");
expectRange("references saved last month", "Last month", "2026-04-30T18:30:00.000Z", "2026-05-31T18:30:00.000Z");
expectRange("pricing pages saved two weeks ago", "2 weeks ago", "2026-05-31T18:30:00.000Z", "2026-06-07T18:30:00.000Z");
expectRange("bookmarks from a month ago", "A month ago", "2026-04-30T18:30:00.000Z", "2026-05-31T18:30:00.000Z");
expectRange("bookmarks from past 30 days", "Past 30 days", "2026-05-19T18:30:00.000Z", "2026-06-18T18:30:00.000Z");
expectRange("on June 10, 2026", "June 10, 2026", "2026-06-09T18:30:00.000Z", "2026-06-10T18:30:00.000Z");
expectRange("between June 1 and June 10", "June 1 - 10, 2026", "2026-05-31T18:30:00.000Z", "2026-06-10T18:30:00.000Z");

const before = parse("saved before June 10");
assert.equal(before.temporal?.kind, "before");
assert.equal(before.temporal?.endUtc, "2026-06-09T18:30:00.000Z");

const after = parse("saved after June 10");
assert.equal(after.temporal?.kind, "after");
assert.equal(after.temporal?.startUtc, "2026-06-10T18:30:00.000Z");

const nyToday = parse("bookmarks I saved today", "America/New_York", NEW_YORK_DST_NOW);
assert.equal(nyToday.temporal?.startUtc, "2026-03-08T05:00:00.000Z");
assert.equal(nyToday.temporal?.endUtc, "2026-03-09T04:00:00.000Z");
const dstHours = DateTime.fromISO(nyToday.temporal!.endUtc!).diff(DateTime.fromISO(nyToday.temporal!.startUtc!), "hours").hours;
assert.equal(dstHours, 23, "DST-start local day should not be assumed to be 24 UTC hours");

const nyYesterday = parse("bookmarks I saved yesterday", "America/New_York", NEW_YORK_DST_NOW);
assert.equal(nyYesterday.temporal?.startUtc, "2026-03-07T05:00:00.000Z");
assert.equal(nyYesterday.temporal?.endUtc, "2026-03-08T05:00:00.000Z");

assert.equal(parse("bookmarks I saved today").residualQuery, "");
assert.equal(parse("dark dashboards I saved today").residualQuery, "dark dashboards");
assert.equal(parse("show me bento pages from last month").residualQuery, "bento pages");
assert.equal(parse("pricing pages saved two weeks ago").residualQuery, "pricing pages");

assert.equal(parse("Monday.com dashboard").temporal, null);
assert.equal(parse("today-style news website").temporal, null);
assert.equal(parse("last month revenue dashboard design").temporal, null);
assert.equal(parse("saved payment dashboard").temporal, null);

assert.equal(parse("bookmarks from June 40").temporal, null);
assert.equal(parse("between June 10 and June 1").temporal, null);
assert.equal(parse("999 days ago").temporal, null);

console.log("temporal search evaluation passed");
