import type { Product } from "@shared/schema";

/** Spec categories (design doc) mapped onto the existing database categories. */
export const CATEGORY_GROUPS: { key: string; label: string; icon: string; members: string[] }[] = [
  { key: "textbooks", label: "Textbooks & Notes", icon: "book-open", members: ["Textbooks", "Second-hand Books", "Reference Books", "Course Notes", "Handwritten Notes", "Previous Year Papers", "Study Materials"] },
  { key: "lab", label: "Lab Equipment", icon: "flask-conical", members: ["Lab Equipment"] },
  { key: "electronics", label: "Electronics", icon: "laptop", members: ["Study Electronics", "Educational Tablets", "Educational Software"] },
  { key: "tools", label: "Engineering Tools", icon: "wrench", members: ["Calculators", "Drawing Instruments"] },
  { key: "stationery", label: "Stationery", icon: "pencil", members: ["Stationery"] },
  { key: "project", label: "Project Components", icon: "cpu", members: ["Project Supplies"] },
  { key: "furniture", label: "Furniture", icon: "armchair", members: ["Study Tables", "Classroom Furniture", "Study Lamps"] },
  { key: "others", label: "Others", icon: "ellipsis", members: ["Backpacks & Bags", "Other Study Materials"] },
];

export const groupOf = (category: string) =>
  CATEGORY_GROUPS.find((g) => g.members.includes(category))?.key ?? "others";

export const priceOf = (p: Product) => Number(p.price) || 0;
export const originalPriceOf = (p: Product) => (p.originalPrice ? Number(p.originalPrice) : 0);
export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const conditionLabel = (c: string) =>
  ({ New: "Brand New", "Like New": "Like New", Good: "Used · Good", Fair: "Used · Fair" } as Record<string, string>)[c] ?? c;
export const isNewCondition = (c: string) => c === "New";

export const locationOf = (p: Product) => p.pickupInstitution || p.pickupCity || "Campus pickup";
export const imageOf = (p: Product) => p.thumbnailUrls?.[0] || p.images?.[0] || p.fullImageUrls?.[0] || "";
export const discountPct = (p: Product) => {
  const o = originalPriceOf(p), c = priceOf(p);
  return o > c && c > 0 ? Math.round((1 - c / o) * 100) : 0;
};

/**
 * "Verified Student" badge. Keep false until seller verification is enforced and verifiable server-side:
 * the badge is a trust claim and must not be shown for unverified sellers.
 */
export const SHOW_VERIFIED_BADGE = false;

const FAV_KEY = "sx.favourites";
export const loadFavourites = (): number[] => {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
};
export const saveFavourites = (ids: number[]) => {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
};
