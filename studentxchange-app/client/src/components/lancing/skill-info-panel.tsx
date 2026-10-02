import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, Award, Clock, BookOpen, Building2, ExternalLink, PlayCircle, ShieldCheck, Sparkles, Loader2
} from "lucide-react";

export interface SkillResource {
  type: "NPTEL" | "YouTube" | "Practice" | "Book" | "Platform" | "Coursera" | "Udemy" | string;
  title: string;
  url?: string;
  duration?: string;
  free?: boolean;
  credit_eligible?: boolean;
  note?: string;
}

export interface SkillInfo {
  skill_name: string;
  why_it_matters: string;
  credit_weight: number;
  estimated_hours: number;
  difficulty: "Easy" | "Medium" | "Hard";
  companies_that_test_this: string[];
  learning_resources: SkillResource[];
}

const RESOURCE_TYPE_STYLE: Record<string, string> = {
  NPTEL: "bg-orange-100 text-orange-800 border-orange-300",
  YouTube: "bg-red-100 text-red-800 border-red-300",
  Practice: "bg-blue-100 text-blue-800 border-blue-300",
  Book: "bg-amber-100 text-amber-800 border-amber-300",
  Platform: "bg-sky-100 text-sky-800 border-sky-300",
  Coursera: "bg-indigo-100 text-indigo-800 border-indigo-300",
  Udemy: "bg-purple-100 text-purple-800 border-purple-300",
};

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: "bg-green-100 text-green-800 border-green-300",
  Medium: "bg-amber-100 text-amber-800 border-amber-300",
  Hard: "bg-red-100 text-red-800 border-red-300",
};

function safeHref(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : null;
  } catch { return null; }
}

const READ_DELAY_SEC = 5;

export default function SkillInfoPanel({
  info, onStartLearning, onMarkCompleted, onAddToRoadmap, onClose,
  hideAddToRoadmap = false,
}: {
  info: SkillInfo;
  onStartLearning: () => void;
  onMarkCompleted: () => void;
  onAddToRoadmap?: () => void;
  onClose: () => void;
  hideAddToRoadmap?: boolean;
}) {
  const [readSec, setReadSec] = useState(0);
  const actionsEnabled = readSec >= READ_DELAY_SEC;

  useEffect(() => {
    const id = setInterval(() => setReadSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-2 sm:my-8">
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-start justify-between gap-3 rounded-t-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <Badge className={DIFFICULTY_STYLE[info.difficulty] || "bg-gray-100 text-gray-700 border-gray-300"}>{info.difficulty}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                    <Award className="w-3 h-3 mr-1" /> {info.credit_weight} credits
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                    <Clock className="w-3 h-3 mr-1" /> ~{info.estimated_hours}h
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{info.skill_name}</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Why it matters */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Why this matters
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{info.why_it_matters}</p>
              </section>

              {/* Companies */}
              {info.companies_that_test_this?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Companies that test this
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {info.companies_that_test_this.map(c => (
                      <Badge key={c} className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Learning Resources */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-sky-500" /> Learning resources
                </h3>
                <div className="space-y-1.5">
                  {info.learning_resources.map((r, i) => {
                    const href = safeHref(r.url);
                    const Wrap: any = href ? "a" : "div";
                    const wrapProps = href ? { href, target: "_blank", rel: "noopener noreferrer" } : { title: r.note || "Link unavailable" };
                    return (
                      <Wrap key={i} {...wrapProps} className={`block p-2.5 rounded-lg border transition-all ${href ? "border-gray-200 hover:border-sky-300 hover:bg-sky-50/50" : "border-gray-200 bg-gray-50 opacity-75"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 leading-snug">{r.title}</div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge className={`${RESOURCE_TYPE_STYLE[r.type] || "bg-gray-100 text-gray-700 border-gray-200"} text-[10px]`}>{r.type}</Badge>
                              {r.duration && <span className="text-[11px] text-gray-500">{r.duration}</span>}
                              {r.free && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">FREE</Badge>}
                              {r.credit_eligible && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                  <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Credit-eligible
                                </Badge>
                              )}
                              {r.note && <span className="text-[11px] text-gray-500 italic">{r.note}</span>}
                            </div>
                          </div>
                          {href && <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />}
                        </div>
                      </Wrap>
                    );
                  })}
                </div>
              </section>

              {/* Read delay notice */}
              {!actionsEnabled && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  <span>Please take {READ_DELAY_SEC - readSec} more second{(READ_DELAY_SEC - readSec) === 1 ? "" : "s"} to read the skill details before choosing an action.</span>
                </div>
              )}

              {/* Actions */}
              <div className="grid sm:grid-cols-3 gap-2">
                <Button onClick={onStartLearning} disabled={!actionsEnabled} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <PlayCircle className="w-4 h-4 mr-1.5" /> Start Learning
                </Button>
                <Button onClick={onMarkCompleted} disabled={!actionsEnabled} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <Award className="w-4 h-4 mr-1.5" /> I've Completed This
                </Button>
                {!hideAddToRoadmap && onAddToRoadmap && (
                  <Button onClick={onAddToRoadmap} disabled={!actionsEnabled} variant="outline">
                    Add to My Roadmap
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 text-center -mt-1">
                "I've Completed This" triggers a Level 1 assessment to award credits.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Builder utility — assemble SkillInfo from existing client metadata ───
export function buildSkillInfo(args: {
  skill: string;
  credits: number;
  hours: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  resources: { title: string; url: string; platform: string; type: "free" | "paid" | "practice" }[];
}): SkillInfo {
  const meta = SKILL_INFO_META[args.skill] || {};
  const inferredDifficulty: "Easy" | "Medium" | "Hard" = args.difficulty
    || meta.difficulty
    || (args.credits >= 4 ? "Hard" : args.credits >= 3 ? "Medium" : "Easy");

  // Map old free/paid/practice resources to new SkillResource shape
  const resources: SkillResource[] = args.resources.map(r => ({
    type: r.type === "practice" ? "Practice" : (r.platform.includes("NPTEL") ? "NPTEL" : r.platform.includes("YouTube") ? "YouTube" : "Platform"),
    title: r.title,
    url: r.url,
    duration: "Self-paced",
    free: r.type === "free" || r.type === "practice",
    credit_eligible: r.platform.includes("NPTEL") || r.platform.includes("SWAYAM"),
  }));

  return {
    skill_name: args.skill,
    why_it_matters: meta.why_it_matters || `${args.skill} is a key competency tested across multiple recruiting companies for your target role. Mastering it boosts your placement readiness score and unlocks higher-tier company eligibility.`,
    credit_weight: args.credits,
    estimated_hours: args.hours,
    difficulty: inferredDifficulty,
    companies_that_test_this: meta.companies || ["TCS", "Infosys", "Wipro"],
    learning_resources: resources,
  };
}

// Per-skill enrichment: difficulty, why-it-matters narrative, hiring companies
export const SKILL_INFO_META: Record<string, { difficulty?: "Easy" | "Medium" | "Hard"; why_it_matters?: string; companies?: string[] }> = {
  "Data Structures & Algorithms": {
    difficulty: "Hard",
    why_it_matters: "Asked in 95% of FAANG/Tier-1 interviews and most online assessments. Core to cracking any SDE role.",
    companies: ["Google", "Microsoft", "Amazon", "Flipkart", "Walmart Labs", "Meta"],
  },
  "Python": {
    difficulty: "Medium",
    why_it_matters: "Most-requested language for data, ML, automation, and backend roles. Default coding language for many startups.",
    companies: ["Google", "Amazon", "Netflix", "Uber", "Razorpay", "Swiggy"],
  },
  "SQL & Databases": {
    difficulty: "Medium",
    why_it_matters: "Tested in nearly every data-related role and product analyst interview. Required for backend/full-stack roles.",
    companies: ["Amazon", "Flipkart", "Meesho", "Zomato", "PayPal", "Goldman Sachs"],
  },
  "React / JavaScript": {
    difficulty: "Medium",
    why_it_matters: "Most in-demand frontend stack. Default for product startups and consumer-facing apps.",
    companies: ["Razorpay", "CRED", "Swiggy", "Flipkart", "Meta", "Atlassian"],
  },
  "Machine Learning Basics": {
    difficulty: "Hard",
    why_it_matters: "Required for any ML/DS/AI role. Even backend roles at AI companies test core ML concepts.",
    companies: ["Google", "Meta", "Amazon", "Microsoft", "Razorpay AI", "Ola Money"],
  },
  "System Design": {
    difficulty: "Hard",
    why_it_matters: "Asked in every Senior SDE / SDE-2 interview at Tier 1 / FAANG. Differentiator for premium roles.",
    companies: ["Google", "Microsoft", "Amazon", "Atlassian", "Uber", "Stripe"],
  },
  "OOPs Concepts": {
    difficulty: "Medium",
    why_it_matters: "Foundation for object-oriented languages (Java, C++, Python). Asked in technical rounds at every IT services and product company.",
    companies: ["TCS", "Infosys", "Wipro", "Cognizant", "Capgemini", "Accenture"],
  },
  "Operating Systems": {
    difficulty: "Hard",
    why_it_matters: "Asked in technical rounds at most product companies and PSU placements. Core CS subject for GATE.",
    companies: ["Microsoft", "Amazon", "Intel", "Qualcomm", "Adobe", "Samsung R&D"],
  },
  "DBMS": {
    difficulty: "Medium",
    why_it_matters: "Tested in technical rounds — query writing, normalization, transaction concepts come up across companies.",
    companies: ["Oracle", "Amazon", "TCS Digital", "Infosys", "Capgemini", "Mu Sigma"],
  },
  "Computer Networks": {
    difficulty: "Medium",
    why_it_matters: "Foundation for backend/DevOps/security roles. Tested in technical rounds at product and PSU companies.",
    companies: ["Cisco", "Akamai", "Cloudflare", "Juniper", "Ericsson", "Nokia"],
  },
  "Aptitude & Logical Reasoning": {
    difficulty: "Easy",
    why_it_matters: "Most Tier-2 IT placements (TCS NQT, Infosys, Wipro, Capgemini) start with aptitude rounds. Cleared = shortlist.",
    companies: ["TCS", "Infosys", "Wipro", "Cognizant", "Capgemini", "HCL"],
  },
  "Communication Skills": {
    difficulty: "Easy",
    why_it_matters: "HR rounds and group discussions are deal-breakers. Strong communication compensates for moderate technical depth.",
    companies: ["TCS", "Deloitte", "EY", "Accenture", "Wipro", "Infosys"],
  },
};
