// src/lib/db.ts

import { Pool, type PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

// Debug logging (development only)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔍 Environment debug info:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- DATABASE_URL available:', !!connectionString);
  console.log('- DATABASE_URL length:', connectionString?.length || 0);
  console.log('- DATABASE_URL starts with postgresql:', connectionString?.startsWith('postgresql://'));
  console.log('- All env vars starting with DATABASE:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
}

// More comprehensive build-time detection for Firebase App Hosting
const isBuildTime =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  (process.env.NODE_ENV === 'development' && !connectionString) ||
  process.argv.includes('build') ||
  process.argv.includes('next:build');

let pool: Pool | null = null;

// Only initialize the pool if not in build time and we have a connection string
if (!isBuildTime && connectionString && connectionString !== 'client-database-url') {
  console.log('🔗 Initializing database connection pool...');

  const ssl = isProduction
    ? {
        ca: process.env.PG_CA,
        rejectUnauthorized: true,
      }
    : false;

  pool = new Pool({
    connectionString,
    ssl,
    // Add connection pool settings for better reliability
    max: 10, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
    connectionTimeoutMillis: 5000, // how long to wait for a connection
  });

  pool.on('connect', () => {
    console.log('✅ New database client connected');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  });

  // Test the connection on startup
  pool.connect()
    .then(client => {
      console.log('✅ Database connection pool initialized successfully');
      client.release();
    })
    .catch(err => {
      console.error('❌ Failed to initialize database connection pool:', err);
    });

} else if (isBuildTime) {
  console.log('🔧 Build time: skipping database connection setup');
} else if (!connectionString) {
  console.error('❌ CRITICAL: DATABASE_URL is not set in the environment.');
} else if (connectionString === 'client-database-url') {
  console.error('❌ CRITICAL: DATABASE_URL appears to be a placeholder value, not an actual connection string.');
  console.error('This usually means the secret "client-database-url" does not exist in Google Cloud Secret Manager.');
  console.error('Please create the secret with: gcloud secrets create client-database-url --data="your-actual-connection-string"');
}

/**
 * Acquires a PostgreSQL client from the connection pool.
 */
export async function getClient(): Promise<PoolClient> {
  if (isBuildTime) {
    throw new Error('Database not available during build time');
  }

  if (!connectionString || connectionString === 'client-database-url') {
    throw new Error('DATABASE_URL is missing or invalid. Cannot connect to the database.');
  }

  if (!pool) {
    throw new Error('Database pool not initialized. This might be a configuration issue.');
  }

  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    console.error('❌ Failed to acquire client from PostgreSQL pool:', err);
    console.error('Connection string (masked):', connectionString?.replace(/\/\/.*@/, '//***:***@'));
    throw err;
  }
}

/**
 * Gracefully close the database pool (useful for cleanup)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    console.log('🔌 Closing database connection pool...');
    await pool.end();
    pool = null;
  }
}
