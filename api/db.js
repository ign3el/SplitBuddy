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
  MYSQLHOST,
  MYSQLHOSTNAME,
  MYSQLPORT,
  MYSQLUSER,
  MYSQLPASSWORD,
  MYSQLDATABASE,
  MYSQL_DB,
  MYSQL_DATABASE,
  MYSQL_SSL,
} = process.env;

function createMysqlPool() {
  const host = DB_HOST || MYSQLHOST || MYSQLHOSTNAME || process.env.MYSQL_HOST;
  const port = Number(DB_PORT || MYSQLPORT || process.env.MYSQL_PORT || 3306);
  const user = DB_USER || MYSQLUSER || process.env.MYSQL_USER;
  const password = DB_PASSWORD || MYSQLPASSWORD || process.env.MYSQL_PASSWORD;
  const database = DB_NAME || MYSQLDATABASE || MYSQL_DB || MYSQL_DATABASE || process.env.MYSQL_DATABASE;
  const sslRequired = (DB_SSL_REQUIRED || MYSQL_SSL || '').toString().toLowerCase() === 'true';
  if (!host || !user || !password || !database) {
    return null;
  }
  return createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
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
