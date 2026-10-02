import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, IndianRupee, ExternalLink, Send, Shield, Bookmark, BookmarkCheck,
  Flame, MapPin, Clock, Calendar, Award, Users, Star,
} from "lucide-react";
import { useState } from "react";
import { firestore } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

/** Converts an ISO timestamp from the server cache to a human-readable "Posted X ago" label. */
function timeAgo(isoString: string): string {
  const diffMin = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diffMin < 1) return "Posted just now";
  if (diffMin < 60) return `Posted ${diffMin} min ago`;
  if (diffMin < 360) return `Posted ${Math.floor(diffMin / 60)}h ago`;
  return "Posted today";
}

export interface OpportunityCardData {
  id?: string;
  title: string;
  company: string;
  company_size?: string;
  source: string;
  source_url?: string;
  url?: string;
  logo_letter?: string;
  logo_color?: string;
  type?: string;
  stipend?: string;
  stipend_numeric?: number;
  work_mode?: string;
  location?: string;
  duration?: string;
  skills?: string[];
  match_reason?: string;
  match_score?: number;
  description?: string;
  perks?: string[];
  deadline?: string;
  experience_level?: string;
  is_hot?: boolean;
  applicants?: string;
  posted_ago?: string;
  posted_at?: string; // ISO timestamp from server cache — drives real-time "Posted X min ago"
  isVerified?: boolean;
  isInternal?: boolean;
}

interface Props {
  data: OpportunityCardData;
  onApply: (data: OpportunityCardData) => void;
  alreadyApplied?: boolean;
  applyLabel?: string;
  userId?: string;
}

const TYPE_STYLES: Record<string, { label: string; cls: string; emoji: string }> = {
  internship: { label: "Internship", cls: "bg-blue-100 text-blue-800 border-blue-200", emoji: "🔵" },
  freelance: { label: "Freelance", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", emoji: "🟢" },
  microtask: { label: "Micro Task", cls: "bg-amber-100 text-amber-800 border-amber-200", emoji: "🟡" },
  hackathon: { label: "Hackathon", cls: "bg-rose-100 text-rose-800 border-rose-200", emoji: "🔴" },
  "part-time": { label: "Part-time", cls: "bg-slate-100 text-slate-700 border-slate-200", emoji: "⚪" },
  "full-time": { label: "Full-time", cls: "bg-indigo-100 text-indigo-800 border-indigo-200", emoji: "🔷" },
  contract: { label: "Contract", cls: "bg-purple-100 text-purple-800 border-purple-200", emoji: "🟣" },
  remote: { label: "Remote", cls: "bg-teal-100 text-teal-800 border-teal-200", emoji: "🌐" },
};

const PERK_ICONS: Record<string, string> = {
  certificate: "🏆",
  "letter of recommendation": "📝",
  lor: "📝",
  ppo: "💼",
  "flexible hours": "⏰",
  stipend: "💰",
  mentorship: "🤝",
  remote: "🏠",
};

function MatchScoreRing({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const ringColor = s >= 80 ? "ring-emerald-400" : s >= 60 ? "ring-amber-400" : "ring-slate-300";
  const textColor = s >= 80 ? "text-emerald-700" : s >= 60 ? "text-amber-700" : "text-slate-600";
  return (
    <div className={`shrink-0 w-9 h-9 rounded-full ring-2 ${ringColor} bg-white flex items-center justify-center`} title={`Match score: ${s}%`}>
      <span className={`text-[10px] font-bold ${textColor}`}>{s}%</span>
    </div>
  );
}

export default function OpportunityCard({ data, onApply, alreadyApplied, applyLabel, userId }: Props) {
  const isExternal = data.isInternal !== true && /^https:\/\//.test(data.url || data.source_url || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || saved || saving) return;
    setSaving(true);
    try {
      const appId = `saved_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(firestore, "lancing_users", userId, "applications", appId), {
        jobId: appId,
        jobTitle: data.title,
        companyName: data.company,
        type: "saved",
        status: "saved",
        appliedAt: new Date().toISOString(),
        source: data.source || "web",
        externalUrl: data.url || data.source_url || "",
        stipend: data.stipend || "",
        work_mode: data.work_mode || "",
        skills: data.skills || [],
      });
      setSaved(true);
    } catch {
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const typeStyle = data.type ? TYPE_STYLES[data.type.toLowerCase()] : null;
  const perks = (data.perks || []).slice(0, 3);

  return (
    <Card className="relative border-slate-200 transition-all overflow-hidden hover:shadow-md hover:border-sky-200">
      <CardContent className="p-3.5 space-y-2.5">
        {/* Header row: logo + title/company + score + bookmark */}
        <div className="flex items-start gap-2.5">
          <div
            className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ backgroundColor: data.logo_color || "#0ea5e9" }}
          >
            {(data.logo_letter || data.company?.[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 leading-snug" data-testid="text-opportunity-title">
                {data.title}
                {data.is_hot && (
                  <span className="ml-1.5 inline-flex items-center align-middle text-orange-500" title="Trending">
                    <Flame className="w-3.5 h-3.5 inline" />
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {typeof data.match_score === "number" && <MatchScoreRing score={data.match_score} />}
                {userId && (
                  <button
                    onClick={handleSave}
                    className={`p-1 rounded transition-colors ${saved ? "text-sky-600" : "text-slate-400 hover:text-sky-500"}`}
                    title={saved ? "Saved to My Applications" : "Save to My Applications"}
                    data-testid="button-save-opportunity"
                  >
                    {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{data.company}</span>
              {data.company_size && (
                <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1 font-normal capitalize border-slate-200 text-slate-500">{data.company_size}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Type + verified/source badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {typeStyle ? (
            <Badge className={`${typeStyle.cls} text-[10px] py-0 px-1.5 font-semibold border`}>{typeStyle.label}</Badge>
          ) : null}
          {data.isVerified ? (
            <Badge title={data.source === "Himalayas" ? "Listed in the official API; employer not independently verified" : undefined} className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px] py-0 px-1.5">
              <Shield className="w-2.5 h-2.5 mr-0.5" />{data.source === "Himalayas" ? "Source checked" : "Verified"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-600">via {data.source || "Web"}</Badge>
          )}
          {data.isVerified && isExternal && data.source === "Himalayas" && (
            <a href="https://himalayas.app/" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="text-[10px] text-sky-700 underline hover:text-sky-900">
              via Himalayas
            </a>
          )}
          {data.experience_level && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-slate-600">{data.experience_level}</Badge>
          )}
        </div>

        {data.match_reason && (
          <div className="text-[11px] bg-blue-50 text-blue-800 border border-blue-100 rounded px-1.5 py-1 line-clamp-2">
            <Star className="w-3 h-3 inline mr-1 -mt-0.5 text-blue-500" />{data.match_reason}
          </div>
        )}

        {data.description && (
          <p className="text-xs text-slate-600 line-clamp-2">{data.description}</p>
        )}

        {/* Stipend / mode / location / duration row */}
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {data.stipend && (() => {
            const raw = data.stipend.trim();
            const hasNumber = /\d/.test(raw);
            const cleaned = raw.replace(/^₹\s?/, "");
            return (
              <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-100">
                {hasNumber && <IndianRupee className="w-2.5 h-2.5" />}{cleaned}
              </span>
            );
          })()}
          {data.work_mode && (
            <span className="inline-flex items-center gap-0.5 bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded font-medium border border-slate-100">
              <MapPin className="w-2.5 h-2.5" />{data.work_mode}{data.location && data.location !== data.work_mode ? ` · ${data.location}` : ""}
            </span>
          )}
          {data.duration && (
            <span className="inline-flex items-center gap-0.5 bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded font-medium border border-slate-100">
              <Clock className="w-2.5 h-2.5" />{data.duration}
            </span>
          )}
        </div>

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.skills.slice(0, 4).map((s, i) => (
              <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">{s}</Badge>
            ))}
            {data.skills.length > 4 && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-slate-500">+{data.skills.length - 4} more</Badge>
            )}
          </div>
        )}

        {/* Perks + applicants + posted/deadline footer */}
        {(perks.length > 0 || data.applicants || data.posted_at || data.posted_ago || data.deadline) && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-500 border-t border-slate-100 pt-1.5">
            {perks.length > 0 && (
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-500" />
                <span>{perks.map((p) => PERK_ICONS[p.toLowerCase()] || "•").join(" ") + " "}{perks[0]}{perks.length > 1 ? ` +${perks.length - 1}` : ""}</span>
              </div>
            )}
            {data.applicants && (
              <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" />{data.applicants} applied</span>
            )}
            {(data.posted_at || data.posted_ago) && (
              <span>{data.posted_at ? timeAgo(data.posted_at) : data.posted_ago}</span>
            )}
            {data.deadline && (
              <span className="inline-flex items-center gap-0.5 text-rose-600"><Calendar className="w-3 h-3" />{data.deadline}</span>
            )}
          </div>
        )}

        <Button
          onClick={(e) => { e.stopPropagation(); onApply(data); }}
          disabled={alreadyApplied}
          className="w-full h-8 text-xs"
          variant={alreadyApplied ? "secondary" : "default"}
          data-testid="button-apply-opportunity"
        >
          {alreadyApplied ? (
            "Already Applied"
          ) : isExternal ? (
            <><ExternalLink className="w-3.5 h-3.5 mr-1.5" />{applyLabel || "Apply Now"}</>
          ) : (
            <><Send className="w-3.5 h-3.5 mr-1.5" />{applyLabel || "Apply Now"}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
