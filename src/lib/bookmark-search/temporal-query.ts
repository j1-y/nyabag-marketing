import { DateTime } from "luxon";

export type TemporalFilterKind = "range" | "before" | "after";

export type TemporalFilter = {
  kind: TemporalFilterKind;
  label: string;
  startUtc?: string;
  endUtc?: string;
  sourceText: string;
};

export type ParsedBookmarkSearchQuery = {
  originalQuery: string;
  residualQuery: string;
  temporal: TemporalFilter | null;
  isDateOnlyQuery: boolean;
};

type TemporalMatch = {
  filter: TemporalFilter;
  startIndex: number;
  endIndex: number;
};

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
};

const MONTH_NAME_PATTERN =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE_PATTERN = `(?:\\d{4}-\\d{2}-\\d{2}|${MONTH_NAME_PATTERN}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH_NAME_PATTERN}(?:\\s+\\d{4})?)`;
const MAX_DAY_OFFSET = 366;
const MAX_WEEK_OFFSET = 104;
const MAX_MONTH_OFFSET = 60;

function parseCount(value: string | undefined): number | null {
  if (!value) return null;
  const clean = value.toLowerCase().trim();
  if (/^\d+$/.test(clean)) return Number.parseInt(clean, 10);
  return NUMBER_WORDS[clean] ?? null;
}

function validateTimeZone(timeZone: string) {
  const candidate = timeZone.trim() || "UTC";
  const probe = DateTime.now().setZone(candidate);
  return probe.isValid ? candidate : "UTC";
}

function nowInZone(now: Date | undefined, zone: string) {
  return (now ? DateTime.fromJSDate(now, { zone: "utc" }) : DateTime.utc()).setZone(zone);
}

function utcIso(value: DateTime) {
  return value.toUTC().toISO({ suppressMilliseconds: false }) ?? value.toUTC().toISO() ?? "";
}

function startOfLocalDay(value: DateTime) {
  return value.startOf("day");
}

function rangeFilter(label: string, sourceText: string, start: DateTime, end: DateTime): TemporalFilter {
  return {
    kind: "range",
    label,
    startUtc: utcIso(start),
    endUtc: utcIso(end),
    sourceText,
  };
}

function beforeFilter(label: string, sourceText: string, end: DateTime): TemporalFilter {
  return {
    kind: "before",
    label,
    endUtc: utcIso(end),
    sourceText,
  };
}

function afterFilter(label: string, sourceText: string, start: DateTime): TemporalFilter {
  return {
    kind: "after",
    label,
    startUtc: utcIso(start),
    sourceText,
  };
}

function formatDateLabel(date: DateTime) {
  return date.setLocale("en-US").toFormat("LLLL d, yyyy");
}

function formatRangeLabel(start: DateTime, endExclusive: DateTime) {
  const end = endExclusive.minus({ days: 1 });
  if (start.hasSame(end, "day")) return formatDateLabel(start);
  if (start.year === end.year && start.month === end.month) {
    return `${start.setLocale("en-US").toFormat("LLLL d")} - ${end.setLocale("en-US").toFormat("d, yyyy")}`;
  }
  if (start.year === end.year) {
    return `${start.setLocale("en-US").toFormat("LLLL d")} - ${end.setLocale("en-US").toFormat("LLLL d, yyyy")}`;
  }
  return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
}

function stripOrdinal(value: string) {
  return value.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
}

function parseDateExpression(value: string, base: DateTime): DateTime | null {
  const clean = stripOrdinal(value).replace(/,/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const zone = base.zoneName ?? "UTC";
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const parsed = DateTime.fromObject(
      { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) },
      { zone },
    );
    return parsed.isValid ? parsed.startOf("day") : null;
  }

  const monthFirst = clean.match(new RegExp(`^(${MONTH_NAME_PATTERN})\\s+(\\d{1,2})(?:\\s+(\\d{4}))?$`, "i"));
  if (monthFirst) {
    const parsed = DateTime.fromObject(
      {
        year: monthFirst[3] ? Number(monthFirst[3]) : base.year,
        month: MONTHS[monthFirst[1].toLowerCase()],
        day: Number(monthFirst[2]),
      },
      { zone },
    );
    return parsed.isValid ? parsed.startOf("day") : null;
  }

  const dayFirst = clean.match(new RegExp(`^(\\d{1,2})\\s+(${MONTH_NAME_PATTERN})(?:\\s+(\\d{4}))?$`, "i"));
  if (dayFirst) {
    const parsed = DateTime.fromObject(
      {
        year: dayFirst[3] ? Number(dayFirst[3]) : base.year,
        month: MONTHS[dayFirst[2].toLowerCase()],
        day: Number(dayFirst[1]),
      },
      { zone },
    );
    return parsed.isValid ? parsed.startOf("day") : null;
  }

  return null;
}

function hasTemporalContext(query: string, startIndex: number, endIndex: number) {
  const before = query.slice(0, startIndex).toLowerCase();
  const after = query.slice(endIndex).toLowerCase();
  const beforeContext = /\b(bookmarks?|things?|references?|saved|save|bookmarked|added|from|on|during|in|show(?: me)?|find(?: me)?)\W*$/.test(before);
  const afterIsEmpty = after.replace(/[,\s.!?;:-]+/g, "") === "";
  const wholeIsTemporal = before.replace(/[,\s.!?;:-]+/g, "") === "" && afterIsEmpty;
  return beforeContext || wholeIsTemporal;
}

function matchExplicitRange(query: string, base: DateTime): TemporalMatch | null {
  const patterns = [
    new RegExp(`\\bbetween\\s+(${DATE_PATTERN})\\s+and\\s+(${DATE_PATTERN})\\b`, "i"),
    new RegExp(`\\bfrom\\s+(${DATE_PATTERN})\\s+to\\s+(${DATE_PATTERN})\\b`, "i"),
    new RegExp(`\\b(${DATE_PATTERN})\\s+through\\s+(${DATE_PATTERN})\\b`, "i"),
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (!match || match.index === undefined) continue;
    const start = parseDateExpression(match[1], base);
    const endDate = parseDateExpression(match[2], base);
    if (!start || !endDate) continue;
    const end = endDate.plus({ days: 1 });
    if (end <= start) return null;
    return {
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      filter: rangeFilter(formatRangeLabel(start, end), match[0], start, end),
    };
  }

  return null;
}

function matchBeforeAfter(query: string, base: DateTime): TemporalMatch | null {
  const pattern = new RegExp(`\\b(before|after)\\s+(${DATE_PATTERN})\\b`, "i");
  const match = query.match(pattern);
  if (!match || match.index === undefined) return null;
  if (!hasTemporalContext(query, match.index, match.index + match[0].length)) return null;

  const date = parseDateExpression(match[2], base);
  if (!date) return null;

  const isBefore = match[1].toLowerCase() === "before";
  return {
    startIndex: match.index,
    endIndex: match.index + match[0].length,
    filter: isBefore
      ? beforeFilter(`Before ${formatDateLabel(date)}`, match[0], date)
      : afterFilter(`After ${formatDateLabel(date)}`, match[0], date.plus({ days: 1 })),
  };
}

function matchSpecificDate(query: string, base: DateTime): TemporalMatch | null {
  const pattern = new RegExp(`\\b(?:on|from|saved(?:\\s+on)?|bookmarked(?:\\s+on)?|added(?:\\s+on)?)\\s+(${DATE_PATTERN})\\b`, "i");
  const match = query.match(pattern);
  if (!match || match.index === undefined) return null;

  const date = parseDateExpression(match[1], base);
  if (!date) return null;
  const end = date.plus({ days: 1 });

  return {
    startIndex: match.index,
    endIndex: match.index + match[0].length,
    filter: rangeFilter(formatDateLabel(date), match[0], date, end),
  };
}

function matchRelativeDay(query: string, base: DateTime): TemporalMatch | null {
  const today = query.match(/\btoday(?![-\w])/i);
  if (today?.index !== undefined) {
    const start = startOfLocalDay(base);
    return {
      startIndex: today.index,
      endIndex: today.index + today[0].length,
      filter: rangeFilter("Today", today[0], start, start.plus({ days: 1 })),
    };
  }

  const yesterday = query.match(/\byesterday(?![-\w])/i);
  if (yesterday?.index !== undefined) {
    const start = startOfLocalDay(base).minus({ days: 1 });
    return {
      startIndex: yesterday.index,
      endIndex: yesterday.index + yesterday[0].length,
      filter: rangeFilter("Yesterday", yesterday[0], start, start.plus({ days: 1 })),
    };
  }

  const daysAgo = query.match(/\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty)\s+days?\s+ago\b/i);
  if (!daysAgo || daysAgo.index === undefined) return null;
  const count = parseCount(daysAgo[1]);
  if (!count || count > MAX_DAY_OFFSET) return null;
  const start = startOfLocalDay(base).minus({ days: count });
  return {
    startIndex: daysAgo.index,
    endIndex: daysAgo.index + daysAgo[0].length,
    filter: rangeFilter(`${count === 1 ? "A day" : `${count} days`} ago`, daysAgo[0], start, start.plus({ days: 1 })),
  };
}

function matchRelativeWeek(query: string, base: DateTime): TemporalMatch | null {
  const weekStart = base.startOf("week");
  const thisWeek = query.match(/\bthis\s+week\b/i);
  if (thisWeek?.index !== undefined && hasTemporalContext(query, thisWeek.index, thisWeek.index + thisWeek[0].length)) {
    return {
      startIndex: thisWeek.index,
      endIndex: thisWeek.index + thisWeek[0].length,
      filter: rangeFilter("This week", thisWeek[0], weekStart, weekStart.plus({ weeks: 1 })),
    };
  }

  const lastWeek = query.match(/\blast\s+week\b/i);
  if (lastWeek?.index !== undefined && hasTemporalContext(query, lastWeek.index, lastWeek.index + lastWeek[0].length)) {
    return {
      startIndex: lastWeek.index,
      endIndex: lastWeek.index + lastWeek[0].length,
      filter: rangeFilter("Last week", lastWeek[0], weekStart.minus({ weeks: 1 }), weekStart),
    };
  }

  const weeksAgo = query.match(/\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+weeks?\s+ago\b/i);
  if (!weeksAgo || weeksAgo.index === undefined) return null;
  const count = parseCount(weeksAgo[1]);
  if (!count || count > MAX_WEEK_OFFSET) return null;
  const start = weekStart.minus({ weeks: count });
  return {
    startIndex: weeksAgo.index,
    endIndex: weeksAgo.index + weeksAgo[0].length,
    filter: rangeFilter(`${count === 1 ? "A week" : `${count} weeks`} ago`, weeksAgo[0], start, start.plus({ weeks: 1 })),
  };
}

function matchRelativeMonth(query: string, base: DateTime): TemporalMatch | null {
  const monthStart = base.startOf("month");
  const thisMonth = query.match(/\bthis\s+month\b/i);
  if (thisMonth?.index !== undefined && hasTemporalContext(query, thisMonth.index, thisMonth.index + thisMonth[0].length)) {
    return {
      startIndex: thisMonth.index,
      endIndex: thisMonth.index + thisMonth[0].length,
      filter: rangeFilter("This month", thisMonth[0], monthStart, monthStart.plus({ months: 1 })),
    };
  }

  const lastMonth = query.match(/\blast\s+month\b/i);
  if (lastMonth?.index !== undefined && hasTemporalContext(query, lastMonth.index, lastMonth.index + lastMonth[0].length)) {
    return {
      startIndex: lastMonth.index,
      endIndex: lastMonth.index + lastMonth[0].length,
      filter: rangeFilter("Last month", lastMonth[0], monthStart.minus({ months: 1 }), monthStart),
    };
  }

  const monthsAgo = query.match(/\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+months?\s+ago\b/i);
  if (!monthsAgo || monthsAgo.index === undefined) return null;
  const count = parseCount(monthsAgo[1]);
  if (!count || count > MAX_MONTH_OFFSET) return null;
  const start = monthStart.minus({ months: count });
  const label = count === 1 ? "A month ago" : `${count} months ago`;
  return {
    startIndex: monthsAgo.index,
    endIndex: monthsAgo.index + monthsAgo[0].length,
    filter: rangeFilter(label, monthsAgo[0], start, start.plus({ months: 1 })),
  };
}

function matchRollingDuration(query: string, base: DateTime): TemporalMatch | null {
  const match = query.match(/\b(?:past|last)\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|thirty)\s+(days?|weeks?|months?)\b/i);
  if (!match || match.index === undefined) return null;
  const count = parseCount(match[1]);
  if (!count) return null;
  const unit = match[2].toLowerCase();
  const end = startOfLocalDay(base).plus({ days: 1 });
  let start: DateTime;
  if (unit.startsWith("day")) {
    if (count > MAX_DAY_OFFSET) return null;
    start = end.minus({ days: count });
  } else if (unit.startsWith("week")) {
    if (count > MAX_WEEK_OFFSET) return null;
    start = end.minus({ weeks: count });
  } else {
    if (count > MAX_MONTH_OFFSET) return null;
    start = end.minus({ months: count });
  }

  return {
    startIndex: match.index,
    endIndex: match.index + match[0].length,
    filter: rangeFilter(`Past ${count} ${unit}`, match[0], start, end),
  };
}

function cleanResidual(query: string, match: TemporalMatch) {
  const before = query.slice(0, match.startIndex);
  const after = query.slice(match.endIndex);
  let residual = `${before} ${after}`
    .replace(/[,\s]+/g, " ")
    .replace(/\s+([.!?;:])/g, "$1")
    .trim();

  residual = residual
    .replace(/^(show me|show|find me|find)\b\s*/i, "")
    .replace(/\b(references?\s+i\s+saved|things?\s+i\s+saved|bookmarks?\s+i\s+saved)\b/gi, " ")
    .replace(/\b(i\s+saved|i\s+bookmarked|i\s+added)\b/gi, " ")
    .replace(/^(bookmarks?|things?|references?)\b\s*/i, "")
    .replace(/\b(bookmarks?|things?|references?)$/i, "")
    .replace(/\b(saved|bookmarked|added)$/i, "")
    .replace(/^(from|on|during|in)\b\s*/i, "")
    .replace(/\b(from|on|during|in)$/i, "")
    .replace(/^[,\s.!?;:-]+|[,\s.!?;:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return residual;
}

export function parseBookmarkSearchQuery(input: {
  query: string;
  timeZone: string;
  locale?: string;
  now?: Date;
}): ParsedBookmarkSearchQuery {
  const originalQuery = input.query;
  const normalizedQuery = originalQuery.replace(/\s+/g, " ").trim();
  const zone = validateTimeZone(input.timeZone || "UTC");
  const base = nowInZone(input.now, zone);

  const match =
    matchExplicitRange(normalizedQuery, base) ??
    matchBeforeAfter(normalizedQuery, base) ??
    matchSpecificDate(normalizedQuery, base) ??
    matchRelativeDay(normalizedQuery, base) ??
    matchRelativeWeek(normalizedQuery, base) ??
    matchRelativeMonth(normalizedQuery, base) ??
    matchRollingDuration(normalizedQuery, base);

  if (!match) {
    return {
      originalQuery,
      residualQuery: normalizedQuery,
      temporal: null,
      isDateOnlyQuery: false,
    };
  }

  const residualQuery = cleanResidual(normalizedQuery, match);

  return {
    originalQuery,
    residualQuery,
    temporal: match.filter,
    isDateOnlyQuery: residualQuery.length === 0,
  };
}
