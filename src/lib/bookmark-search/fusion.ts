import { BOOKMARK_SEARCH_CONFIG } from "./config";
import type { BookmarkSearchMode } from "./types";

export type SearchCandidateInput = {
  bookmarkId: string;
  lexicalRank?: number;
  lexicalScore?: number;
  semanticRank?: number;
  semanticSimilarity?: number;
  visualRank?: number;
  visualScore?: number;
  exactMatchScore?: number;
  reasons?: string[];
};

export type FusedSearchCandidate = {
  bookmarkId: string;
  searchScore: number;
  searchMode: BookmarkSearchMode;
  lexicalScore: number;
  semanticSimilarity: number;
  visualScore: number;
  exactMatchScore: number;
  reasons: string[];
};

type MutableCandidate = FusedSearchCandidate & {
  bestRank: number;
};

export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\s+/g, " ");
}

function reciprocalRank(rank: number | undefined, weight: number): number {
  if (rank === undefined || rank < 0) {
    return 0;
  }

  return weight / (BOOKMARK_SEARCH_CONFIG.reciprocalRankK + rank + 1);
}

function clamp01(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function uniqueReasons(reasons: string[]): string[] {
  const seen = new Set<string>();
  const compact: string[] = [];

  for (const reason of reasons) {
    const clean = reason.trim();
    if (!clean || seen.has(clean.toLowerCase())) {
      continue;
    }
    seen.add(clean.toLowerCase());
    compact.push(clean);
    if (compact.length >= BOOKMARK_SEARCH_CONFIG.reasonLimit) {
      break;
    }
  }

  return compact;
}

function classifySearchMode(candidate: MutableCandidate): BookmarkSearchMode {
  if (candidate.exactMatchScore > 0.75) {
    return "exact";
  }

  const hasLexical = candidate.lexicalScore >= BOOKMARK_SEARCH_CONFIG.minimumLexicalScore;
  const hasSemantic = candidate.semanticSimilarity >= BOOKMARK_SEARCH_CONFIG.minimumSemanticSimilarity;
  const hasVisual = candidate.visualScore >= BOOKMARK_SEARCH_CONFIG.minimumVisualScore;

  if ((hasLexical && hasSemantic) || (hasLexical && hasVisual) || (hasSemantic && hasVisual)) {
    return "hybrid";
  }

  if (hasSemantic || hasVisual) {
    return "semantic";
  }

  return "keyword";
}

function fallbackReasons(candidate: FusedSearchCandidate): string[] {
  if (candidate.searchMode === "exact") {
    return ["Exact bookmark match"];
  }
  if (candidate.searchMode === "hybrid") {
    return ["Keyword and memory signals agree"];
  }
  if (candidate.searchMode === "semantic") {
    return ["Similar visual memory"];
  }
  return ["Keyword match"];
}

export function fuseSearchCandidates(candidates: SearchCandidateInput[]): FusedSearchCandidate[] {
  const byId = new Map<string, MutableCandidate>();

  for (const input of candidates) {
    if (!input.bookmarkId) {
      continue;
    }

    const current =
      byId.get(input.bookmarkId) ??
      ({
        bookmarkId: input.bookmarkId,
        searchScore: 0,
        searchMode: "keyword",
        lexicalScore: 0,
        semanticSimilarity: 0,
        visualScore: 0,
        exactMatchScore: 0,
        reasons: [],
        bestRank: Number.MAX_SAFE_INTEGER,
      } satisfies MutableCandidate);

    current.lexicalScore = Math.max(current.lexicalScore, clamp01(input.lexicalScore));
    current.semanticSimilarity = Math.max(current.semanticSimilarity, clamp01(input.semanticSimilarity));
    current.visualScore = Math.max(current.visualScore, clamp01(input.visualScore));
    current.exactMatchScore = Math.max(current.exactMatchScore, clamp01(input.exactMatchScore));
    current.bestRank = Math.min(
      current.bestRank,
      input.lexicalRank ?? Number.MAX_SAFE_INTEGER,
      input.semanticRank ?? Number.MAX_SAFE_INTEGER,
      input.visualRank ?? Number.MAX_SAFE_INTEGER,
    );
    current.reasons = uniqueReasons([...current.reasons, ...(input.reasons ?? [])]);

    current.searchScore += reciprocalRank(input.lexicalRank, BOOKMARK_SEARCH_CONFIG.lexicalWeight);
    current.searchScore += reciprocalRank(input.semanticRank, BOOKMARK_SEARCH_CONFIG.semanticWeight);
    current.searchScore += reciprocalRank(input.visualRank, BOOKMARK_SEARCH_CONFIG.visualWeight);
    current.searchScore += current.lexicalScore * 0.35;
    current.searchScore += current.semanticSimilarity * 0.22;
    current.searchScore += current.visualScore * 0.18;
    current.searchScore += current.exactMatchScore * BOOKMARK_SEARCH_CONFIG.exactWeight;

    byId.set(input.bookmarkId, current);
  }

  return Array.from(byId.values())
    .map((candidate) => {
      const searchMode = classifySearchMode(candidate);
      const reasons = candidate.reasons.length > 0 ? candidate.reasons : fallbackReasons({ ...candidate, searchMode });

      return {
        bookmarkId: candidate.bookmarkId,
        searchScore: candidate.searchScore,
        searchMode,
        lexicalScore: candidate.lexicalScore,
        semanticSimilarity: candidate.semanticSimilarity,
        visualScore: candidate.visualScore,
        exactMatchScore: candidate.exactMatchScore,
        reasons: uniqueReasons(reasons),
      };
    })
    .sort((a, b) => {
      if (b.searchScore !== a.searchScore) {
        return b.searchScore - a.searchScore;
      }
      if (b.exactMatchScore !== a.exactMatchScore) {
        return b.exactMatchScore - a.exactMatchScore;
      }
      if (b.lexicalScore !== a.lexicalScore) {
        return b.lexicalScore - a.lexicalScore;
      }
      return b.semanticSimilarity - a.semanticSimilarity;
    });
}

export function filterStrongSearchResults(candidates: FusedSearchCandidate[]): FusedSearchCandidate[] {
  if (candidates.length === 0) {
    return [];
  }

  const bestScore = candidates[0]?.searchScore ?? 0;
  const minimumRelativeScore = Math.max(
    BOOKMARK_SEARCH_CONFIG.minimumHybridScore,
    bestScore - BOOKMARK_SEARCH_CONFIG.maximumScoreGapFromBest,
  );

  return candidates
    .filter((candidate) => {
      if (candidate.exactMatchScore > 0) {
        return true;
      }
      if (candidate.lexicalScore >= BOOKMARK_SEARCH_CONFIG.minimumLexicalScore) {
        return true;
      }
      if (candidate.semanticSimilarity >= BOOKMARK_SEARCH_CONFIG.minimumSemanticSimilarity) {
        return true;
      }
      if (candidate.visualScore >= BOOKMARK_SEARCH_CONFIG.minimumVisualScore) {
        return true;
      }
      return candidate.searchScore >= minimumRelativeScore;
    })
    .slice(0, BOOKMARK_SEARCH_CONFIG.finalResultLimit);
}
