// src/lib/db.ts
import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

function initializePool(): Pool {
  const instanceUnixSocket = process.env.INSTANCE_UNIX_SOCKET; // e.g. /cloudsql/PROJECT:REGION:INSTANCE
  const useUnixSocket =
    instanceUnixSocket && process.env.DB_USE_UNIX_SOCKET !== "false";

  if (useUnixSocket) {
    const dbUser = process.env.DB_USER;
    const dbName = process.env.DB_NAME;
    // DB_PASSWORD is intentionally optional: when Cloud SQL Auth Proxy uses IAM
    // database authentication, the proxy handles auth and no password is required.
    const dbPassword = process.env.DB_PASSWORD;

    if (!dbUser || !dbName) {
      throw new Error(
        "INSTANCE_UNIX_SOCKET is set but DB_USER and/or DB_NAME are missing.",
      );
    }

    const poolConfig: ConstructorParameters<typeof Pool>[0] = {
      user: dbUser,
      database: dbName,
      host: instanceUnixSocket,
    };
    if (dbPassword) {
      poolConfig.password = dbPassword;
    }

    const newPool = new Pool(poolConfig);

    newPool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });

    console.log("✅ PostgreSQL pool initialized via Cloud SQL Unix socket.");
    return newPool;
  }

  // Fallback: direct TCP connection via DATABASE_URL
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ CRITICAL: DATABASE_URL is not set in the environment.");
    throw new Error(
      "Neither INSTANCE_UNIX_SOCKET nor DATABASE_URL is configured. Cannot connect to the database.",
    );
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

  console.log("✅ PostgreSQL pool initialized via DATABASE_URL (TCP).");
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
