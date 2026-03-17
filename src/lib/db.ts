// src/lib/db.ts
import { Pool, type PoolClient } from "pg";
import { Connector } from "@google-cloud/cloud-sql-connector";
import { IpAddressTypes } from "@google-cloud/cloud-sql-connector";

let pool: Pool | null = null;
let connector: InstanceType<typeof Connector> | null = null;

/**
 * Creates a pool using the Cloud SQL Node.js Connector.
 * Requires: CLOUD_SQL_CONNECTION_NAME, DB_USER, DB_PASSWORD, DB_NAME
 */
async function createCloudSqlPool(): Promise<Pool> {
  const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;

  if (!instanceConnectionName || !dbUser || !dbName) {
    throw new Error(
      "Cloud SQL Connector requires CLOUD_SQL_CONNECTION_NAME, DB_USER, and DB_NAME.",
    );
  }

  const validTypes = Object.values(IpAddressTypes) as string[];
  const ipAddressType = validTypes.includes(process.env.CLOUD_SQL_IP_TYPE ?? "")
    ? (process.env.CLOUD_SQL_IP_TYPE as IpAddressTypes)
    : IpAddressTypes.PUBLIC;

  connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: ipAddressType,
  });

  const searchPath = process.env.DB_SCHEMA ?? "public";

  const newPool = new Pool({
    ...clientOpts,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    max: 10,
    options: `-c search_path=${searchPath}`,
  });

  newPool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
  });

  console.log(
    `✅ PostgreSQL pool initialized via Cloud SQL Connector (${instanceConnectionName}).`,
  );
  return newPool;
}

/**
 * Creates a pool using a direct TCP connection via DATABASE_URL.
 */
function createDirectPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Cannot connect to the database.");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const ssl = isProduction ? { rejectUnauthorized: false } : false;

  const searchPath = process.env.DB_SCHEMA ?? "public";

  const newPool = new Pool({
    connectionString,
    ssl,
    options: `-c search_path=${searchPath}`,
  });

  newPool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
  });

  console.log("✅ PostgreSQL pool initialized via DATABASE_URL (TCP).");
  return newPool;
}

/**
 * Acquires a PostgreSQL client from the connection pool.
 *
 * Connection mode is controlled by DB_CONNECTION_MODE:
 *   "connector" → Cloud SQL Node.js Connector (authenticated, no public IP needed)
 *   "direct"    → DATABASE_URL TCP connection (default)
 */
export async function getClient(): Promise<PoolClient> {
  if (!pool) {
    const mode = process.env.DB_CONNECTION_MODE ?? "direct";

    if (mode === "connector") {
      pool = await createCloudSqlPool();
    } else {
      pool = createDirectPool();
    }
  }

  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    console.error("❌ Failed to acquire client from PostgreSQL pool:", err);
    throw err;
  }
}
