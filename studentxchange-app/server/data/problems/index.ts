// ─── Static Problem Bank (1000 problems) ─────────────────────────────────────
// Serves as the single source of truth for problem list/detail.
// User progress (solved IDs, bookmarks, streaks) remains in Firestore.
export type { Problem, Diff } from "./types";
import { PART1 } from "./part1";
import { PART2 } from "./part2";
import { PART3 } from "./part3";

export const PROBLEM_BANK = [...PART1, ...PART2, ...PART3];

/** Find a problem by slug. */
export function findProblem(slug: string) {
  return PROBLEM_BANK.find((p) => p.slug === slug) ?? null;
}

/** Get problems matching optional difficulty + tag filters. */
export function filterProblems(opts?: {
  difficulty?: string;
  tag?: string;
  slugs?: string[];
}) {
  let list = PROBLEM_BANK;
  if (opts?.difficulty) list = list.filter((p) => p.difficulty === opts.difficulty);
  if (opts?.tag) list = list.filter((p) => p.tags.includes(opts.tag!));
  if (opts?.slugs) list = list.filter((p) => opts.slugs!.includes(p.slug));
  return list;
}
