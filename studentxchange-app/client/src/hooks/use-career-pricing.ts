import { useQuery } from "@tanstack/react-query";

export interface CareerPricing {
  currency: "INR";
  amount: string;
  displayPrice: string;
  priceLabel: string;
  durationDays: number;
  freeFeatures: string[];
  premiumFeatures: string[];
}

function isCareerPricing(value: unknown): value is CareerPricing {
  if (!value || typeof value !== "object") return false;
  const pricing = value as Record<string, unknown>;
  return pricing.currency === "INR"
    && typeof pricing.amount === "string"
    && typeof pricing.displayPrice === "string"
    && typeof pricing.priceLabel === "string"
    && typeof pricing.durationDays === "number"
    && Array.isArray(pricing.freeFeatures)
    && pricing.freeFeatures.every((feature) => typeof feature === "string")
    && Array.isArray(pricing.premiumFeatures)
    && pricing.premiumFeatures.every((feature) => typeof feature === "string");
}

async function fetchCareerPricing(): Promise<CareerPricing> {
  let response: Response;
  try {
    response = await fetch("/api/career-compass/pricing");
  } catch {
    throw new Error("Career Compass pricing is unavailable. Please try again.");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body
      && typeof body.error === "string"
      ? body.error
      : "Career Compass pricing is unavailable. Please try again.";
    throw new Error(message);
  }
  if (!isCareerPricing(body)) {
    throw new Error("Career Compass pricing could not be loaded. Please try again.");
  }

  return body;
}

export function useCareerPricing() {
  const query = useQuery<CareerPricing, Error>({
    queryKey: ["/api/career-compass/pricing"],
    queryFn: fetchCareerPricing,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    pricing: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
}