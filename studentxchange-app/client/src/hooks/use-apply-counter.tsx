import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

interface CounterData {
  month: string;
  count: number;
  freeLimit: number;
  remaining: number;
  requiresPayment: boolean;
  feeAmount: number;
  paidPasses: number;
  aiMatchCount: number;
  aiMatchFreeLimit: number;
  aiMatchRemaining: number;
}

async function getToken(): Promise<string | null> {
  const u = auth.currentUser;
  if (!u) return null;
  return await u.getIdToken();
}

export function useApplyCounter() {
  const qc = useQueryClient();

  const query = useQuery<CounterData>({
    queryKey: ["/api/lancing/apply-counter"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return {
        month: "unlimited", count: 0, freeLimit: 9999, remaining: 9999,
        requiresPayment: false, feeAmount: 0, paidPasses: 9999,
        aiMatchCount: 0, aiMatchFreeLimit: 9999, aiMatchRemaining: 9999,
      };
      const res = await fetch("/api/lancing/apply-counter", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return {
        month: "unlimited", count: 0, freeLimit: 9999, remaining: 9999,
        requiresPayment: false, feeAmount: 0, paidPasses: 9999,
        aiMatchCount: 0, aiMatchFreeLimit: 9999, aiMatchRemaining: 9999,
      };
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const consume = useMutation({
    mutationFn: async (_source?: "general" | "ai_match") => {
      const token = await getToken();
      if (!token) return { used: "free", count: 0, remaining: 9999, paidPasses: 9999, aiMatchRemaining: 9999 };
      const res = await fetch("/api/lancing/apply-counter/consume", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ source: _source || "general" }),
      });
      if (!res.ok) return { used: "free", count: 0, remaining: 9999, paidPasses: 9999, aiMatchRemaining: 9999 };
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lancing/apply-counter"] });
    },
  });

  const redeem = useMutation({
    mutationFn: async (_txnid: string) => ({ success: true, passesAdded: 0 }),
  });

  return { ...query, consume, redeem };
}
