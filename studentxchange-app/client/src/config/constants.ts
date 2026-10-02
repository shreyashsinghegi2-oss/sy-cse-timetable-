/**
 * client/src/config/constants.ts
 * Client-side admin email constants for UI visibility checks.
 * NOTE: These are UI-only guards. Real security enforcement lives on the server.
 * Update server/config/constants.ts in sync with changes here.
 */

export const PLATFORM_ADMIN_EMAIL = "hrishikesh.vallakati2006@gmail.com";

export const MARKETPLACE_ADMIN_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "gautambennurkar@gmail.com",
  "meghanamaydeo@gmail.com",
];

export const STATETECH_ADMIN_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "facultyaero11@adypu.edu.in",
];

export const NAT_CONF_ADMIN_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "gautamsantoshbennurkar@gmail.com",
  "soldier162128@gmail.com",
];

export const NETX_ADMIN_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "gautamsantoshbennurkar@gmail.com",
];

// ─── Career Compass degree / year option lists ───────────────────────────────
// Single source of truth lives in shared/career-data.ts so the personal flow,
// the Institutional Career Map view and the admin Roadmap Manager all share the
// exact same option sets. Re-exported here for existing import paths.
export { CAREER_DEGREES, CAREER_YEARS, DEGREE_GROUPS } from "@shared/career-data";

export const HASTECH_ADMIN_EMAILS = [
  PLATFORM_ADMIN_EMAIL,
  "yadnyesh.khapekar@adypu.edu.in",
  "sameer.agarwal@adypu.edu.in",
  "ganesh.mundhe@adypu.edu.in",
  "e25b000279@adypu.edu.in",
];
