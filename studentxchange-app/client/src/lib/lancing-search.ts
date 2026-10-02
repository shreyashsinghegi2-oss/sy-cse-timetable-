import Fuse, { type IFuseOptions } from "fuse.js";

const SEMANTIC_ALIASES: Record<string, string[]> = {
  aero: ["aerospace", "aeronautical", "aviation", "drone", "uav"],
  aerospace: ["aero", "aeronautical", "aviation", "drone"],
  ai: ["artificial intelligence", "machine learning", "ml", "deep learning", "nlp", "llm"],
  ml: ["machine learning", "ai", "artificial intelligence", "deep learning"],
  web: ["frontend", "backend", "full stack", "fullstack", "react", "vue", "angular", "html", "css", "javascript"],
  frontend: ["web", "react", "vue", "angular", "html", "css", "javascript", "ui"],
  backend: ["web", "node", "express", "django", "flask", "api", "server", "database"],
  app: ["mobile", "android", "ios", "react native", "flutter", "kotlin", "swift"],
  mobile: ["app", "android", "ios", "react native", "flutter"],
  data: ["data science", "analytics", "sql", "python", "pandas", "tableau", "power bi"],
  cyber: ["cybersecurity", "security", "ethical hacking", "pentesting", "infosec"],
  cloud: ["aws", "azure", "gcp", "devops", "kubernetes", "docker"],
  devops: ["cloud", "aws", "azure", "kubernetes", "docker", "ci cd"],
  blockchain: ["web3", "crypto", "solidity", "smart contracts", "defi", "nft"],
  game: ["game development", "unity", "unreal", "godot"],
  iot: ["internet of things", "embedded", "arduino", "raspberry pi"],
  mech: ["mechanical engineering", "cad", "solidworks", "catia", "autocad", "manufacturing"],
  mechanical: ["mech", "cad", "solidworks", "catia", "autocad", "manufacturing"],
  cad: ["mechanical engineering", "solidworks", "catia", "autocad", "design"],
  civil: ["civil engineering", "autocad drafting", "structural", "construction", "surveying"],
  electrical: ["electrical engineering", "circuit", "pcb", "embedded", "power systems", "matlab"],
  pcb: ["electrical engineering", "circuit", "embedded", "vlsi"],
  embedded: ["electrical engineering", "iot", "arduino", "raspberry pi", "vlsi"],
  robotics: ["robotic", "automation", "ros", "embedded", "ai"],
  doctor: ["medical", "mbbs", "clinical", "healthcare", "physician"],
  medical: ["doctor", "mbbs", "clinical", "healthcare", "nursing", "pharmacy", "physiotherapy"],
  pharma: ["pharmacy", "pharmaceutical", "drug", "medical", "clinical"],
  nursing: ["healthcare", "medical", "patient care"],
  physio: ["physiotherapy", "rehab", "fitness", "sports therapy"],
  nutrition: ["dietetics", "diet", "fitness", "meal planning", "health coaching"],
  business: ["bba", "mba", "sales", "marketing", "strategy", "operations", "hr"],
  finance: ["accounting", "excel", "financial modeling", "bookkeeping", "gst", "tally", "investment"],
  marketing: ["digital marketing", "social media", "seo", "ads", "brand", "content strategy"],
  seo: ["search engine optimization", "marketing", "google ads", "content"],
  design: ["graphic design", "ui", "ux", "figma", "logo", "branding", "creative"],
  graphic: ["design", "logo", "branding", "poster", "creative", "adobe"],
  ux: ["ui", "design", "figma", "wireframe", "prototype", "user experience"],
  ui: ["ux", "design", "figma", "frontend", "user interface"],
  video: ["video editing", "reels", "animation", "motion graphics", "youtube"],
  photo: ["photography", "videography", "editing", "lightroom", "photoshop"],
  bio: ["biotechnology", "biology", "lab research", "scientific"],
  chem: ["chemistry", "chemical research", "lab", "quality testing"],
  physics: ["mathematics", "tutoring", "simulation", "research"],
  law: ["legal", "research", "documentation", "contract", "compliance"],
  legal: ["law", "contract", "compliance", "research"],
  journalism: ["article writing", "blogging", "reporting", "media"],
  pr: ["public relations", "outreach", "communication"],
  psych: ["psychology", "counseling", "mental wellness", "research"],
  writing: ["content writing", "editing", "proofreading", "script", "blog"],
  tutor: ["tutoring", "teaching", "subject", "doubt solving", "exam prep"],
  teach: ["tutor", "tutoring", "language teaching", "education"],
  campus: ["event volunteer", "survey", "promotion", "outreach", "registration"],
  resume: ["resume design", "portfolio", "linkedin", "career"],
  ppt: ["presentation", "powerpoint", "slides", "design"],
  excel: ["spreadsheet", "data entry", "finance", "bookkeeping"],
  startup: ["entrepreneurship", "co founder", "pitch deck", "mvp", "founder"],
  intern: ["internship", "trainee", "stipend"],
  remote: ["work from home", "wfh", "online", "distributed"],
};

export function expandQuery(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const expanded = new Set<string>([q, ...tokens]);
  for (const tok of tokens) {
    const aliases = SEMANTIC_ALIASES[tok];
    if (aliases) aliases.forEach((a) => expanded.add(a));
    for (const [key, aliases2] of Object.entries(SEMANTIC_ALIASES)) {
      if (key.startsWith(tok) || tok.startsWith(key)) {
        expanded.add(key);
        aliases2.forEach((a) => expanded.add(a));
      }
    }
  }
  return Array.from(expanded);
}

const DEFAULT_FUSE_OPTIONS: IFuseOptions<any> = {
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  shouldSort: true,
  useExtendedSearch: false,
  keys: [
    { name: "title", weight: 3 },
    { name: "company", weight: 1.5 },
    { name: "companyName", weight: 1.5 },
    { name: "skills", weight: 2.5 },
    { name: "description", weight: 1 },
    { name: "sector", weight: 2 },
    { name: "category", weight: 2 },
    { name: "semantic_keywords", weight: 2 },
  ],
};

export function fuzzySearch<T extends Record<string, any>>(
  items: T[],
  query: string,
  options?: Partial<IFuseOptions<T>>,
): T[] {
  const q = query.trim();
  if (!q || items.length === 0) return items;
  const fuse = new Fuse(items, { ...DEFAULT_FUSE_OPTIONS, ...options });
  const expanded = expandQuery(q);
  const bestScore = new Map<T, number>();
  for (const term of expanded) {
    const results = fuse.search(term);
    for (const r of results) {
      const s = r.score ?? 1;
      const existing = bestScore.get(r.item);
      if (existing === undefined || s < existing) bestScore.set(r.item, s);
    }
  }
  return Array.from(bestScore.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([item]) => item);
}

export function formatRelativeTime(ms: number): string {
  if (!ms) return "just now";
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
