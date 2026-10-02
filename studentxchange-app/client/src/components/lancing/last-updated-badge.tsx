import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/lancing-search";

interface LastUpdatedBadgeProps {
  timestamp: number | undefined;
  isFetching?: boolean;
  className?: string;
}

export function LastUpdatedBadge({ timestamp, isFetching, className }: LastUpdatedBadgeProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  if (!timestamp) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-slate-500 ${className || ""}`}
      data-testid="last-updated-badge"
      title={new Date(timestamp).toLocaleString()}
    >
      <Clock className={`w-3 h-3 ${isFetching ? "animate-spin text-sky-500" : ""}`} />
      <span>{isFetching ? "Updating…" : `Updated ${formatRelativeTime(timestamp)}`}</span>
    </span>
  );
}
