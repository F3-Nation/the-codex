// src/lib/db.ts
import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

function initializePool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ CRITICAL: DATABASE_URL is not set in the environment.");
    throw new Error("DATABASE_URL is missing. Cannot connect to the database.");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const ssl = isProduction ? { rejectUnauthorized: false } : false;

  const newPool = new Pool({
    connectionString,
    ssl,
  });

  newPool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
  });

  return newPool;
}

/**
 * Acquires a PostgreSQL client from the connection pool.
 */
export async function getClient(): Promise<PoolClient> {
  // Lazily initialize the pool only when a client is needed
  if (!pool) {
    pool = initializePool();
  }

  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    console.error("❌ Failed to acquire client from PostgreSQL pool:", err);
    throw err;
  }
}
