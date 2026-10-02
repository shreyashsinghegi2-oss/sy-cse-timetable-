import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

export type CareerSubscription = {
  isPremium: boolean;
  isAdmin: boolean;
  subscriptionType: "FREE" | "PREMIUM";
  paymentStatus: string;
  expiryDate: string | null;
  purchaseDate: string | null;
  expired: boolean;
};

const FREE_FALLBACK: CareerSubscription = {
  isPremium: false,
  isAdmin: false,
  subscriptionType: "FREE",
  paymentStatus: "none",
  expiryDate: null,
  purchaseDate: null,
  expired: false,
};

async function fetchSubscription(): Promise<CareerSubscription> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) return FREE_FALLBACK;
  const res = await fetch("/api/career-compass/subscription", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return FREE_FALLBACK;
  return res.json();
}

// Reads the authoritative subscription status from the server. The server is
// the single source of truth — the client never decides premium locally.
export function useCareerSubscription(enabled = true) {
  const query = useQuery<CareerSubscription>({
    queryKey: ["/api/career-compass/subscription"],
    queryFn: fetchSubscription,
    enabled,
    staleTime: 60_000,
  });

  const data = query.data ?? FREE_FALLBACK;
  return {
    subscription: data,
    isPremium: data.isPremium,
    isAdmin: data.isAdmin,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
