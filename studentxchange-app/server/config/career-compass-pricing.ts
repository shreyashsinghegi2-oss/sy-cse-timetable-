// The only current purchase price. Historical payments keep their stored amount.
export const CAREER_COMPASS_PREMIUM_PRICE = "499.00";
export const CAREER_COMPASS_PREMIUM_DURATION_DAYS = 365;

export function getCareerCompassPricing() {
  const displayPrice = `₹${Number(CAREER_COMPASS_PREMIUM_PRICE).toLocaleString("en-IN")}`;
  return {
    currency: "INR",
    amount: CAREER_COMPASS_PREMIUM_PRICE,
    displayPrice,
    priceLabel: `${displayPrice}/year`,
    durationDays: CAREER_COMPASS_PREMIUM_DURATION_DAYS,
    freeFeatures: [
      "Career mapping and goals", "Skill selection", "AI career roadmap", "Saved roadmap and progress",
    ],
    premiumFeatures: [
      "Everything in Free", "Placement Readiness", "Skill assessments", "Student exams",
      "Guiding skills and learning paths", "Coding Arena",
    ],
  };
}