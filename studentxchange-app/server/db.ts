import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced database configuration for deployment compatibility
const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  // Sized for ~300 concurrent users. Most requests hold a connection for
  // only a few ms (simple read/write), so 25 handles well above the peak
  // expected demand while staying within Replit's PG connection limits.
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000, // Fail fast — better a quick 503 than a hanging request
  maxUses: 7500,
});

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('[DB POOL ERROR]', err.message);
});

// Test database connection on startup
pool.connect((err, client, release) => {
  if (err) {
  } else {
    if (client) {
      release();
    }
  }
});

export const db = drizzle(pool, { schema });