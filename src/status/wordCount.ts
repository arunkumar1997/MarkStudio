// Pure document statistics for the status-bar indicator (T-2.4, Phase 2 M2.4).
//
// This module is intentionally free of any `vscode` or DOM dependency so it can
// be unit-tested directly (ADR-0011). `WordCountStatusBar` owns the VS Code
// glue; the counting logic lives here.

export interface DocumentStats {
  readonly words: number;
  readonly characters: number;
  readonly readingMinutes: number;
}

// Average adult silent reading speed for prose; a deliberately simple constant
// (the indicator is an estimate, not a precise metric).
const WORDS_PER_MINUTE = 200;

// A "word" is a run of Unicode letters/numbers/marks, allowing internal
// apostrophes or hyphens (so "don't" and "well-known" count once). Markdown
// punctuation (`#`, `*`, `[`, `]`, backticks, …) is not letters/numbers, so it
// is naturally excluded from the count.
const WORD_PATTERN = /[\p{L}\p{N}\p{M}]+(?:['’-][\p{L}\p{N}\p{M}]+)*/gu;

export function computeDocumentStats(text: string): DocumentStats {
  const words = countWords(text);
  const characters = text.length;
  const readingMinutes =
    words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return { words, characters, readingMinutes };
}

function countWords(text: string): number {
  const matches = text.match(WORD_PATTERN);
  return matches === null ? 0 : matches.length;
}
