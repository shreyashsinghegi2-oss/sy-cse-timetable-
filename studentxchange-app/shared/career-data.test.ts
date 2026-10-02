import assert from "node:assert/strict";
import test from "node:test";
import {
  ASPIRATIONS,
  CAREER_GOALS,
  CAREER_SECTORS,
  LEGACY_ASPIRATION_LABELS,
  buildCareerSelectionContext,
  findCareerGoal,
  searchCareerGoals,
} from "./career-data";

test("career taxonomy covers all sectors and keeps canonical labels unique", () => {
  assert.equal(CAREER_SECTORS.length, 20);
  assert.ok(CAREER_GOALS.length > 300);
  assert.equal(new Set(CAREER_GOALS.map((goal) => goal.label)).size, CAREER_GOALS.length);
  assert.equal(new Set(CAREER_GOALS.map((goal) => goal.id)).size, CAREER_GOALS.length);
  assert.ok(CAREER_SECTORS.every((sector) => sector.families.length > 0));
});

test("every canonical goal has career-map enrichment metadata", () => {
  const fields: (keyof (typeof CAREER_GOALS)[number])[] = [
    "searchTerms", "relatedCourses", "coreSkills", "technologies",
    "certifications", "entryLevelRoles", "midLevelRoles", "seniorRoles",
    "relatedCareers", "alternativePaths", "projectIdeas", "internshipAreas",
    "higherStudyOptions", "entrepreneurshipOpportunities",
  ];
  for (const goal of CAREER_GOALS) {
    for (const field of fields) assert.ok(Array.isArray(goal[field]) && goal[field].length > 0, `${goal.label}: ${field}`);
  }
});

test("legacy aspiration labels resolve to their canonical career", () => {
  assert.equal(LEGACY_ASPIRATION_LABELS.length, 83);
  for (const label of LEGACY_ASPIRATION_LABELS) {
    assert.ok(findCareerGoal(label), `${label} should remain resolvable`);
  }
  assert.ok(ASPIRATIONS.some((aspiration) => aspiration.label === "Software Engineer"));
});

test("representative search terms find relevant careers including XR", () => {
  const expects = (query: string, label: string) =>
    assert.ok(searchCareerGoals(query).some((goal) => goal.label === label), `${query} should find ${label}`);
  expects("AI", "AI Engineer");
  expects("VR", "VR Developer");
  expects("finance", "Financial Analyst");
  expects("design", "UI/UX Designer");
  expects("engineering", "Mechanical Engineer");
  expects("law", "Lawyer / Advocate");
  expects("medicine", "Doctor / Physician");
  expects("business", "Business Analyst");
  expects("sports", "Sports Coach");
  assert.equal(searchCareerGoals("AI", 1)[0]?.label, "AI Engineer");
  assert.equal(searchCareerGoals("VR", 1)[0]?.label, "VR Developer");
});

test("multi-goal mapping payloads are deterministic and expose shared foundations", () => {
  const first = buildCareerSelectionContext(["AI / ML Engineer", "UI/UX Designer"]);
  const second = buildCareerSelectionContext(["AI / ML Engineer", "UI/UX Designer"]);
  assert.deepEqual(first, second);
  assert.deepEqual(first.selected_goals.map((goal) => "stable_id" in goal ? goal.stable_id : ""), [
    "ai-engineer",
    "ui-ux-designer",
  ]);
  assert.ok(first.shared_foundation_skills.includes("Communication"));
  assert.equal(buildCareerSelectionContext(["A niche custom role"]).selected_goals[0]?.custom, true);
});