/**
 * server/config/constants.ts
 * Central place for admin emails and other platform-wide constants.
 * Update here — changes propagate everywhere automatically.
 */

// ─── Platform Owner ────────────────────────────────────────────────────────────
export const PLATFORM_ADMIN_EMAIL = "hrishikesh.vallakati2006@gmail.com";

// Accounts that receive Career Compass Premium access without payment.
// This does not grant platform-admin or owner verification privileges.
export const CAREER_COMPASS_PREMIUM_ACCESS_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "mohd.anam@adypu.edu.in",
];

// ─── Marketplace Co-Admins ─────────────────────────────────────────────────────
export const MARKETPLACE_ADMIN_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "gautambennurkar@gmail.com",
  "meghanamaydeo@gmail.com",
];

// ─── Feature-level admin lists ─────────────────────────────────────────────────
// Collab / social moderation admin
export const COLLAB_ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

// Lancing platform admin
export const LANCING_ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL;

// STATETECH showcase admins
export const STATETECH_ADMIN_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "facultyaero11@adypu.edu.in",
];

// National Conference admins
export const NAT_CONF_ADMIN_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "gautamsantoshbennurkar@gmail.com",
  "soldier162128@gmail.com",
];

// HASTECH event admins
export const HASTECH_ADMIN_EMAILS = [PLATFORM_ADMIN_EMAIL];

// ─── Collab UID shortcuts (used for seeding / connection bootstrapping) ─────────
// These are public Firestore profile UIDs — not secrets. They identify specific
// user profiles used during connection seeding at startup. Not credentials.
export const PLATFORM_OWNER_UID = "8Hx5VVeS3eW2zuKPRHspD8znQjb2";
export const SEED_CONNECTION_UIDS = [
  "8StOP6TQakeM8kBRzEDnMlcQNOk1", // gautam
  "rUZyjjLy1RN1ae4pxhOFpGkIp003", // coding club
];
