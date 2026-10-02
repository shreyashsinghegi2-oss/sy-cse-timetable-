/**
 * Load-test rate-limit reset utility.
 *
 * NEVER expose this as an HTTP endpoint.
 * Run manually from the server host only:
 *
 *   npx tsx server/scripts/clear-rate-limits.ts             # clear ALL keys
 *   npx tsx server/scripts/clear-rate-limits.ts --prefix public_ai   # clear by prefix
 *   npx tsx server/scripts/clear-rate-limits.ts --prefix payment     # payment keys only
 *
 * This is the only safe way to reset Postgres rate-limit state between load-test runs.
 * In-memory limiter state (for low-volume endpoints) resets automatically on server restart.
 */

import { pool } from "../db";

async function main() {
  // Parse --prefix argument
  let prefix: string | null = null;
  const prefixIdx = process.argv.indexOf("--prefix");
  if (prefixIdx !== -1 && process.argv[prefixIdx + 1]) {
    prefix = process.argv[prefixIdx + 1];
  } else {
    const eqArg = process.argv.find((a) => a.startsWith("--prefix="));
    if (eqArg) prefix = eqArg.split("=")[1];
  }

  let result: { rowCount: number | null };
  if (prefix) {
    result = await pool.query(
      "DELETE FROM rate_limit_store WHERE key LIKE $1",
      [`${prefix}%`],
    );
    console.log(`✅ Cleared ${result.rowCount ?? 0} rate-limit keys with prefix "${prefix}"`);
  } else {
    result = await pool.query("DELETE FROM rate_limit_store");
    console.log(`✅ Cleared all ${result.rowCount ?? 0} rate-limit keys from rate_limit_store`);
  }

  // Also show remaining rows for verification
  const remaining = await pool.query("SELECT COUNT(*) FROM rate_limit_store");
  console.log(`   Rows remaining: ${remaining.rows[0].count}`);

  await pool.end();
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
