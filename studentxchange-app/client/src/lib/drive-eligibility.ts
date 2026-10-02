export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  hasProfile: boolean;
}

export function computeDriveEligibility(drive: any, ccp: any): EligibilityResult {
  if (!ccp || !ccp.fullName) {
    return { eligible: false, hasProfile: false, reasons: ["Complete your Career Compass profile to see eligibility."] };
  }

  const reasons: string[] = [];

  const cgpaNum = parseFloat(String(ccp.currentCgpa ?? ccp.cgpa ?? ""));
  if (drive.eligibility?.minCGPA > 0 && !isNaN(cgpaNum) && cgpaNum < Number(drive.eligibility.minCGPA)) {
    reasons.push(`Your CGPA (${cgpaNum}) is below the minimum of ${drive.eligibility.minCGPA}`);
  }

  const pct12 = parseFloat(String(ccp.pct12 ?? ccp.marks12 ?? ""));
  if (drive.eligibility?.min12Pct != null && drive.eligibility.min12Pct > 0 && !isNaN(pct12) && pct12 < Number(drive.eligibility.min12Pct)) {
    reasons.push(`Your 12th % (${pct12}%) is below the minimum of ${drive.eligibility.min12Pct}%`);
  }

  const pct10 = parseFloat(String(ccp.pct10 ?? ccp.marks10 ?? ""));
  if (drive.eligibility?.min10Pct != null && drive.eligibility.min10Pct > 0 && !isNaN(pct10) && pct10 < Number(drive.eligibility.min10Pct)) {
    reasons.push(`Your 10th % (${pct10}%) is below the minimum of ${drive.eligibility.min10Pct}%`);
  }

  const branch = String(ccp.branch || ccp.degree || "");
  if (drive.eligibility?.branches?.length > 0 && branch) {
    const allowed = drive.eligibility.branches.map((b: string) => b.toLowerCase());
    if (!allowed.includes(branch.toLowerCase())) {
      reasons.push(`Your branch (${branch}) is not in the eligible list: ${drive.eligibility.branches.join(", ")}`);
    }
  }

  const year = String(ccp.yearOfStudy || ccp.year || "");
  if (drive.eligibility?.batches?.length > 0 && year) {
    const allowed = drive.eligibility.batches.map((b: string) => b.toLowerCase());
    if (!allowed.includes(year.toLowerCase())) {
      reasons.push(`Your batch/year (${year}) is not eligible. Eligible: ${drive.eligibility.batches.join(", ")}`);
    }
  }

  return { eligible: reasons.length === 0, hasProfile: true, reasons };
}

export function hasAnyEligibilityCriteria(drive: any): boolean {
  const e = drive.eligibility;
  if (!e) return false;
  return (
    (e.minCGPA && e.minCGPA > 0) ||
    (e.min12Pct != null && e.min12Pct > 0) ||
    (e.min10Pct != null && e.min10Pct > 0) ||
    (e.branches?.length > 0) ||
    (e.batches?.length > 0) ||
    (e.maxBacklogs != null)
  );
}
