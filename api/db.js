// Singleton MySQL pool for Vercel serverless
// Caches the pool on globalThis to reuse across invocations
import { createPool } from 'mysql2/promise';

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SSL_REQUIRED,
} = process.env;

function createMysqlPool() {
  if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    return null;
  }
  return createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: DB_SSL_REQUIRED === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
  });
}

// Reuse a single pool per serverless runtime
const pooled = globalThis.__sbMysqlPool ?? (globalThis.__sbMysqlPool = createMysqlPool());

export function getPool() {
  return pooled;
}
