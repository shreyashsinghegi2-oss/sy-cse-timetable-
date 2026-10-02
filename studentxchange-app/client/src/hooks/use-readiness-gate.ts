import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";

export interface ReadinessScore {
  total: number;
  threshold: number;
  eligible: boolean;
  breakdown: {
    skills: { score: number; weight: number; max: number };
    coe_credits: { score: number; weight: number; max: number };
    portal_activity: { score: number; weight: number; max: number };
    profile: { score: number; weight: number; max: number };
    cgpa: { score: number; weight: number; max: number };
  };
  gaps: string[];
}

const DEFAULT_SCORE: ReadinessScore = {
  total: 0, threshold: 70, eligible: false,
  breakdown: {
    skills: { score: 0, weight: 35, max: 35 },
    coe_credits: { score: 0, weight: 20, max: 20 },
    portal_activity: { score: 0, weight: 25, max: 25 },
    profile: { score: 0, weight: 10, max: 10 },
    cgpa: { score: 0, weight: 10, max: 10 },
  },
  gaps: ["Complete your placement readiness profile to apply."],
};

export function useReadinessGate() {
  const [score, setScore] = useState<ReadinessScore | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const u = auth.currentUser;
      if (!u) { setScore(DEFAULT_SCORE); return; }
      const token = await u.getIdToken();
      const r = await fetch("/api/placement/readiness-score", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data: ReadinessScore = await r.json();
        setScore(data);
      } else {
        setScore(DEFAULT_SCORE);
      }
    } catch {
      setScore(DEFAULT_SCORE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => { refresh(); });
    return () => unsub();
  }, [refresh]);

  const canApply = !!score?.eligible;
  return { score: score || DEFAULT_SCORE, loading, canApply, refresh };
}
