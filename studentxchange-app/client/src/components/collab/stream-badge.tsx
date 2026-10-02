import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { STREAMS } from "@shared/schema";

interface StreamBadgeProps {
  stream: typeof STREAMS[number];
  variant?: "default" | "compact" | "outline";
  showCrossStreamIcon?: boolean;
  testId?: string;
}

// Color mapping for each academic stream - each has unique color combination
const STREAM_COLORS: Record<typeof STREAMS[number], { bg: string; text: string; border: string }> = {
  "Engineering & Technology": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  "Computer Science & IT": { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
  "Science": { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },
  "Medicine & Health Sciences": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  "Commerce & Business": { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  "Arts": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  "Humanities": { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
  "Social Sciences": { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
  "Law": { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  "Design & Architecture": { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
  "Media & Communication": { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
  "Education": { bg: "bg-lime-100", text: "text-lime-800", border: "border-lime-300" },
  "Agriculture & Environmental": { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  "Vocational & Polytechnic": { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
  "Performing & Fine Arts": { bg: "bg-fuchsia-100", text: "text-fuchsia-800", border: "border-fuchsia-300" },
  "Languages & Literature": { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
  "Hospitality & Tourism": { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-300" },
  "Pharmacy": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "Nursing": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  "Dentistry": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  "Allied Health": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Mathematics & Statistics": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "Economics": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "Psychology": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  "Sociology": { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  "Political Science": { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  "History": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Philosophy": { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" },
  "Physical Education & Sports Sciences": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "Earth & Geological Sciences": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Other": { bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-300" },
};

// Short abbreviations for compact view
const STREAM_ABBREVIATIONS: Record<typeof STREAMS[number], string> = {
  "Engineering & Technology": "Engg",
  "Computer Science & IT": "CS/IT",
  "Science": "Science",
  "Medicine & Health Sciences": "Medicine",
  "Commerce & Business": "Commerce",
  "Arts": "Arts",
  "Humanities": "Humanities",
  "Social Sciences": "Social Sci",
  "Law": "Law",
  "Design & Architecture": "Design",
  "Media & Communication": "Media",
  "Education": "Education",
  "Agriculture & Environmental": "Agriculture",
  "Vocational & Polytechnic": "Vocational",
  "Performing & Fine Arts": "Fine Arts",
  "Languages & Literature": "Languages",
  "Hospitality & Tourism": "Hospitality",
  "Pharmacy": "Pharmacy",
  "Nursing": "Nursing",
  "Dentistry": "Dentistry",
  "Allied Health": "Allied Health",
  "Mathematics & Statistics": "Math/Stats",
  "Economics": "Economics",
  "Psychology": "Psychology",
  "Sociology": "Sociology",
  "Political Science": "Pol Sci",
  "History": "History",
  "Philosophy": "Philosophy",
  "Physical Education & Sports Sciences": "PE/Sports",
  "Earth & Geological Sciences": "Earth Sci",
  "Other": "Other",
};

export function StreamBadge({ stream, variant = "default", showCrossStreamIcon = false, testId }: StreamBadgeProps) {
  const colors = STREAM_COLORS[stream] || STREAM_COLORS["Other"];
  const label = variant === "compact" ? STREAM_ABBREVIATIONS[stream] : stream;

  return (
    <Badge
      variant={variant === "outline" ? "outline" : "secondary"}
      className={`
        ${colors.bg} ${colors.text} border ${colors.border}
        ${variant === "compact" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"}
        font-medium rounded-full flex items-center gap-1 w-fit
      `}
      data-testid={testId}
    >
      {showCrossStreamIcon && (
        <Sparkles className="h-3 w-3" />
      )}
      {label}
    </Badge>
  );
}

// Component to show cross-stream collaboration indicator
interface CrossStreamIndicatorProps {
  userStream: typeof STREAMS[number];
  otherStream: typeof STREAMS[number];
  isOpenToCrossStream?: boolean;
  testId?: string;
}

export function CrossStreamIndicator({ userStream, otherStream, isOpenToCrossStream = false, testId }: CrossStreamIndicatorProps) {
  const isDifferentStream = userStream !== otherStream;
  
  if (!isDifferentStream && !isOpenToCrossStream) {
    return null;
  }

  return (
    <div className="flex items-center gap-1" data-testid={testId}>
      {isDifferentStream && (
        <Badge 
          variant="outline" 
          className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 border-purple-300 rounded-full font-medium"
          data-testid={testId ? `${testId}-different-stream` : undefined}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Cross-Stream
        </Badge>
      )}
      {isOpenToCrossStream && (
        <Badge 
          variant="outline" 
          className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-300 rounded-full font-medium"
          data-testid={testId ? `${testId}-open-collab` : undefined}
        >
          Open to Collab
        </Badge>
      )}
    </div>
  );
}
