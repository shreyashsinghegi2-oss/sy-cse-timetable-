// A rolling 30-day publication window applies to browse/search results.
// Never use the time we imported or verified an external record as its post date.
export const MAX_POSTING_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const HIMALAYAS_VERIFICATION_TTL_MS = 15 * 60 * 60 * 1000;

export function isRecentPosting(value: unknown, now: Date = new Date()): boolean {
  let postedAt: number;
  if (value && typeof value === "object" && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    postedAt = date instanceof Date ? date.getTime() : NaN;
  } else if (value instanceof Date) {
    postedAt = value.getTime();
  } else if (typeof value === "number") {
    postedAt = value;
  } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    postedAt = new Date(value).getTime();
  } else {
    return false;
  }
  const age = now.getTime() - postedAt;
  return Number.isFinite(age) && age >= 0 && age < MAX_POSTING_AGE_MS;
}