import type { CareerContext } from "./career-hybrid";

export type CareerIssue = {
  path: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
};

function atPath(root: any, path: string): unknown {
  const normalized = path.replace(/\[(\d+)\]/g, ".$1");
  if (!/^(?:years\.\d+\.(?:skills\.\d+(?:\.(?:name|why_it_matters))?|targets(?:\.\d+)?|label|studentlancing_fit(?:\.description)?)|project_suggestions\.\d+(?:\.(?:project_title|relevance))?|career_map\.(?:primary_path|next_12_months|next_24_months)|overall_summary)$/.test(normalized)) return undefined;
  const value = normalized.split(".").reduce((item: any, part) => item?.[part], root);
  if (value == null) return undefined;
  if (/^years\.\d+\.skills\.\d+$/.test(normalized)) {
    return { name: value?.name, why_it_matters: value?.why_it_matters };
  }
  if (/^project_suggestions\.\d+$/.test(normalized)) {
    return { project_title: value?.project_title, relevance: value?.relevance };
  }
  return value;
}

function compact(value: unknown, max = 250): string {
  return (typeof value === "string" ? value : JSON.stringify(value) || "").slice(0, max);
}

/** Never put the full candidate or its resources in a Claude review request. */
export function buildCareerReviewPacket(
  context: CareerContext,
  roadmap: any,
  issues: CareerIssue[],
  reasons: string[],
) {
  const sections: Array<{ path: string; value: string; question: string; nearbySkills?: string[] }> = [];
  const prioritized = [...issues].sort((a, b) =>
    ["critical", "high", "medium", "low"].indexOf(a.severity) -
    ["critical", "high", "medium", "low"].indexOf(b.severity));
  for (const issue of prioritized) {
    if (sections.some((section) => section.path === issue.path)) continue;
    if (sections.length === 4) {
      if (issue.severity === "critical" || issue.severity === "high") {
        throw new Error("Too many material issues for a compact review packet.");
      }
      break;
    }
    const value = atPath(roadmap, issue.path);
    if (value === undefined) {
      if (issue.severity === "critical" || issue.severity === "high") {
        throw new Error("Material issue cannot be represented in a compact review packet.");
      }
      continue;
    }
    const match = issue.path.match(/^years(?:\.|\[)(\d+)/);
    const previousYear = match ? roadmap?.years?.[Number(match[1]) - 1] : null;
    sections.push({
      path: issue.path.slice(0, 90),
      value: compact(value),
      question: issue.reason.slice(0, 180),
      ...(previousYear ? { nearbySkills: (previousYear.skills || []).slice(0, 3).map((skill: any) => String(skill.name || "").slice(0, 60)) } : {}),
    });
  }
  if (!sections.length) {
    sections.push(
      { path: "career_map.primary_path", value: compact(roadmap?.career_map?.primary_path), question: "Is this path appropriate for the degree and goals?" },
      { path: "overall_summary", value: compact(roadmap?.overall_summary), question: "Are there material contradictions or unsafe claims?" },
      { path: "years[0].targets", value: compact((roadmap?.years?.[0]?.targets || []).slice(0, 2)), question: "Is the first-year direction realistic?" },
    );
  }
  const profile = context.profile as any;
  return {
    student: {
      degree: String(context.degree).slice(0, 100),
      year: String(context.year).slice(0, 20),
      goals: Array.isArray(context.goals) ? context.goals.slice(0, 3).map((goal) => String(goal).slice(0, 100)) : String(context.goals).slice(0, 200),
      currentSkills: Array.isArray(profile?.skillsKnown) ? profile.skillsKnown.slice(0, 5).map((skill: unknown) => String(skill).slice(0, 50)) : [],
    },
    reasons: reasons.slice(0, 4).map((reason) => reason.slice(0, 100)),
    sections,
  };
}