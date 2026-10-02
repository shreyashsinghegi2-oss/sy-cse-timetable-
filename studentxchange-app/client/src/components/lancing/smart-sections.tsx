import OpportunityCard, { OpportunityCardData } from "./opportunity-card";

interface SmartSectionsProps {
  items: OpportunityCardData[];
  appliedIds: Set<string>;
  onApply: (opp: OpportunityCardData) => void;
  applyCounter?: { remaining: number; paidPasses: number } | null;
}

interface Section {
  id: string;
  label: string;
  emoji: string;
  filter: (item: OpportunityCardData) => boolean;
}

const SKILLS_AI = new Set(["react", "python", "ai", "ml", "machine learning", "deep learning", "tensorflow", "pytorch", "llm", "nlp", "data science", "node", "typescript", "javascript", "angular", "vue", "django", "flask", "fastapi"]);
const SKILLS_CREATIVE = new Set(["figma", "canva", "photoshop", "illustrator", "video editing", "graphic design", "ui", "ux", "animation", "adobe", "branding", "logo", "reels"]);
const SKILLS_MEDICAL = new Set(["medical", "healthcare", "clinical", "nursing", "pharmacy", "nutrition", "physiotherapy", "doctor", "pharma", "health"]);
const SKILLS_CAMPUS = new Set(["event", "volunteer", "survey", "campus", "promotion", "brand ambassador", "offline"]);

function hasSkillMatch(item: OpportunityCardData, set: Set<string>): boolean {
  const haystack = [
    ...(item.skills || []),
    item.title || "",
    item.description || "",
    (item as any).sector || "",
    (item as any).category || "",
  ]
    .join(" ")
    .toLowerCase();
  for (const kw of Array.from(set)) {
    if (haystack.includes(kw)) return true;
  }
  return false;
}

const SECTIONS: Section[] = [
  {
    id: "beginner",
    label: "Beginner Friendly",
    emoji: "🌱",
    filter: (item) => {
      const lvl = ((item as any).experience_level || "").toLowerCase();
      const stipend = (item as any).stipend_numeric ?? 0;
      return lvl.includes("fresher") || lvl.includes("0-1") || lvl.includes("entry") || (stipend > 0 && stipend < 8000);
    },
  },
  {
    id: "remote",
    label: "Remote Opportunities",
    emoji: "🌐",
    filter: (item) => {
      const mode = ((item as any).work_mode || item.work_mode || "").toLowerCase();
      return mode.includes("remote") || mode.includes("wfh") || mode.includes("work from home");
    },
  },
  {
    id: "high_paying",
    label: "High Paying Roles",
    emoji: "💰",
    filter: (item) => ((item as any).stipend_numeric ?? 0) > 10000,
  },
  {
    id: "startup",
    label: "Startup Hiring",
    emoji: "🚀",
    filter: (item) => {
      const size = ((item as any).company_size || "").toLowerCase();
      const title = (item.title || "").toLowerCase();
      return size === "startup" || title.includes("startup") || title.includes("early stage");
    },
  },
  {
    id: "ai_tech",
    label: "AI & Tech Jobs",
    emoji: "🤖",
    filter: (item) => hasSkillMatch(item, SKILLS_AI),
  },
  {
    id: "creative",
    label: "Creative Freelancing",
    emoji: "🎨",
    filter: (item) => hasSkillMatch(item, SKILLS_CREATIVE),
  },
  {
    id: "medical",
    label: "Medical Opportunities",
    emoji: "🏥",
    filter: (item) => hasSkillMatch(item, SKILLS_MEDICAL),
  },
  {
    id: "campus",
    label: "Campus Quick Earnings",
    emoji: "🏫",
    filter: (item) =>
      hasSkillMatch(item, SKILLS_CAMPUS) ||
      ((item as any).type === "microtask") ||
      (item.title || "").toLowerCase().includes("campus"),
  },
];

export function SmartSections({ items, appliedIds, onApply }: SmartSectionsProps) {
  if (!items || items.length === 0) return null;

  const visibleSections = SECTIONS.map((s) => ({
    ...s,
    matches: items.filter(s.filter).slice(0, 8),
  })).filter((s) => s.matches.length >= 2);

  if (visibleSections.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 mt-6">
      {visibleSections.map((section) => (
        <div key={section.id}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-lg">{section.emoji}</span>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">{section.label}</h3>
            <span className="text-xs text-slate-400 font-medium ml-1">{section.matches.length} found</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {section.matches.map((item) => (
              <div key={item.id || item.url} className="shrink-0 w-72 sm:w-80">
                <OpportunityCard
                  data={item}
                  onApply={onApply}
                  alreadyApplied={appliedIds.has(item.id || item.url || "")}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
