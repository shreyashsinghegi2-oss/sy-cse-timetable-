/**
 * shared/career-keys.ts
 * Deterministic normalisation for Career Compass institutional roadmaps.
 * MUST be used identically on the student side and the admin side so that a
 * roadmap published by an admin for a given degree + year resolves to the same
 * Firestore document a student reads.
 */

/** Normalise a degree/branch label into a stable key (e.g. "B.Tech Computer Science" -> "b_tech_computer_science"). */
export function degreeKey(degree: string | null | undefined): string {
  const slug = (degree || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return slug || "unknown";
}

/** Normalise a year-of-study label into a stable key (e.g. "2nd Year" -> "2nd_year"). */
export function yearKey(year: string | null | undefined): string {
  const slug = (year || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return slug || "unknown";
}

/** Composite Firestore document id for institutionalRoadmaps collection. */
export function instRoadmapDocId(degree: string | null | undefined, year: string | null | undefined): string {
  return `${degreeKey(degree)}__${yearKey(year)}`;
}
