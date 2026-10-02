interface Sector {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
}

export const SECTORS: Sector[] = [
  {
    id: "engineering",
    label: "Engineering & Tech",
    emoji: "⚙️",
    keywords: ["engineering", "tech", "web", "software", "ai", "ml", "cybersecurity", "cad", "robotics", "iot", "aerospace", "civil", "embedded", "developer", "backend", "frontend"],
  },
  {
    id: "medical",
    label: "Medical & Healthcare",
    emoji: "🏥",
    keywords: ["medical", "healthcare", "clinical", "nursing", "pharmacy", "nutrition", "physiotherapy", "mbbs", "doctor", "health", "pharma"],
  },
  {
    id: "business",
    label: "Business & Finance",
    emoji: "💼",
    keywords: ["business", "finance", "marketing", "sales", "hr", "excel", "bba", "mba", "accounting", "operations", "business development", "bookkeeping"],
  },
  {
    id: "design",
    label: "Design & Creative",
    emoji: "🎨",
    keywords: ["design", "graphic", "ui", "ux", "figma", "video editing", "animation", "photography", "creative", "branding", "illustration"],
  },
  {
    id: "media",
    label: "Media & Communication",
    emoji: "📱",
    keywords: ["media", "journalism", "content writing", "social media", "pr", "public relations", "communication", "blogging", "reporting", "copywriting"],
  },
  {
    id: "law",
    label: "Law & Legal",
    emoji: "⚖️",
    keywords: ["law", "legal", "contract", "compliance", "legal research", "documentation", "advocate", "llb", "paralegal"],
  },
  {
    id: "science",
    label: "Science & Research",
    emoji: "🔬",
    keywords: ["science", "research", "biology", "chemistry", "physics", "data science", "lab", "analytics", "biotechnology"],
  },
  {
    id: "education",
    label: "Education & Tutoring",
    emoji: "📚",
    keywords: ["education", "tutoring", "teaching", "language teaching", "doubt solving", "exam prep", "online tutor", "subject"],
  },
  {
    id: "startup",
    label: "Startup & Entrepreneurship",
    emoji: "🚀",
    keywords: ["startup", "entrepreneurship", "founder", "co-founder", "mvp", "pitch deck", "early stage", "venture"],
  },
  {
    id: "campus",
    label: "Campus Tasks",
    emoji: "🏫",
    keywords: ["campus", "event volunteer", "survey", "promotion", "brand ambassador", "qr campaign", "college", "offline"],
  },
  {
    id: "freelance",
    label: "Freelance Digital",
    emoji: "💻",
    keywords: ["freelance", "upwork", "fiverr", "freelancer", "remote gig", "digital", "project-based", "work from home"],
  },
];

interface SectorChipsProps {
  selectedSectors: string[];
  onToggle: (id: string) => void;
  className?: string;
}

export function SectorChips({ selectedSectors, onToggle, className }: SectorChipsProps) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 scrollbar-hide ${className || ""}`} style={{ scrollbarWidth: "none" }}>
      {SECTORS.map((s) => {
        const active = selectedSectors.includes(s.id);
        return (
          <button
            key={s.id}
            onClick={() => onToggle(s.id)}
            className={`
              shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 select-none
              ${active
                ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50"}
            `}
            title={s.label}
          >
            <span>{s.emoji}</span>
            <span className="whitespace-nowrap">{s.label}</span>
          </button>
        );
      })}
      {selectedSectors.length > 0 && (
        <button
          onClick={() => selectedSectors.forEach((id) => onToggle(id))}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
          title="Clear all filters"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}
