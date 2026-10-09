/**
 * MySQL Connection Helper
 * ------------------------------------------------------------
 * Single, reusable place that owns the MySQL connection pool for
 * the whole app. Any feature that needs the database — request
 * tracking today, an admin dashboard or reports later — should
 * import getPool() from here rather than creating its own
 * connection. That keeps connection settings and pool sizing in
 * one spot.
 *
 * All credentials come from environment variables (set these in
 * Hostinger's hPanel -> Environment Variables, or in a local .env
 * file for development). Nothing is hard-coded here.
 *
 * Required variables:
 *   DB_HOST      e.g. localhost
 *   DB_USER      your MySQL username
 *   DB_PASSWORD  your MySQL password
 *   DB_NAME      your MySQL database name
 * Optional:
 *   DB_PORT      defaults to 3306
 *
 * If these are not set, getPool() returns null and every feature
 * built on top of it (see server/tracking.ts) quietly no-ops
 * instead of crashing the app — the video downloader itself never
 * depends on the database being available.
 * ------------------------------------------------------------
 */
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let loggedMissingConfig = false;

/**
 * Returns the shared MySQL pool, creating it on first use.
 * Returns null (instead of throwing) if DB_HOST / DB_USER / DB_NAME
 * are not configured, so callers can fail open.
 */
export function getPool(): mysql.Pool | null {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

  if (!host || !user || !database) {
    if (!loggedMissingConfig) {
      console.warn(
        '[db] MySQL is not configured (DB_HOST / DB_USER / DB_NAME missing from environment variables). ' +
        'Database-backed features (request tracking, etc.) are disabled; the downloader itself is unaffected.'
      );
      loggedMissingConfig = true;
    }
    return null;
  }

  // Managed/cloud MySQL (Aiven, TiDB, RDS...) require TLS. DB_SSL=true is
  // enough for providers with a publicly trusted certificate; DB_SSL_CA
  // takes the provider's CA certificate text when they use their own.
  const sslMode = (process.env.DB_SSL || '').toLowerCase();
  const ca = process.env.DB_SSL_CA;
  const ssl = ca
    ? { ca: ca.replace(/\\n/g, '\n') }
    : sslMode === 'true' || sslMode === 'required'
    ? { rejectUnauthorized: true }
    : sslMode === 'skip-verify'
    ? { rejectUnauthorized: false }
    : undefined;

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
  });
  console.log(`[db] connecting to ${host}:${port}/${database}${ssl ? ' (SSL on)' : ' (no SSL)'}`);

  return pool;
}

/**
 * Quick connectivity check — useful for a health-check endpoint or
 * for confirming setup right after deployment.
 */
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  const p = getPool();
  if (!p) {
    return { ok: false, error: 'MySQL is not configured (missing environment variables).' };
  }
  try {
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unknown database connection error.' };
  }
}
