export const BOOKMARK_SEARCH_CONFIG = {
  minQueryLength: 2,
  debounceMs: 350,
  finalResultLimit: 12,
  lexicalCandidateLimit: 40,
  semanticCandidateLimit: 40,
  visualCandidateLimit: 40,
  reciprocalRankK: 50,
  lexicalWeight: 1.25,
  semanticWeight: 1,
  visualWeight: 0.65,
  exactWeight: 1.6,
  minimumLexicalScore: 0.08,
  minimumSemanticSimilarity: 0.42,
  minimumVisualScore: 0.3,
  minimumHybridScore: 0.04,
  maximumScoreGapFromBest: 0.55,
  reasonLimit: 3,
} as const;

export function isBookmarkSearchDebugEnabled(): boolean {
  if (typeof process === "undefined") {
    return false;
  }

  return process.env.NYABAG_SEARCH_DEBUG === "1";
}
