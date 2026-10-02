/** Hide this legacy partner label in UI without changing stored institution identifiers. */
const hiddenInstitution = /\bveloces[\s_-]*campus\b/i;

export function displayInstitutionName(value: unknown, fallback = "Your Institution"): string {
  const name = typeof value === "string" ? value.trim() : "";
  return !name || hiddenInstitution.test(name) ? fallback : name;
}

export function redactInstitutionText(value: string): string {
  return value.replace(/\bveloces[\s_-]*campus\b/gi, "your institution");
}