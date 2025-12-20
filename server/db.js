// Singleton MySQL pool with Railway env mapping
import { createPool } from 'mysql2/promise';

function resolveDbEnv() {
  const env = process.env;
  const host = env.DB_HOST || env.MYSQLHOST || env.MYSQLHOSTNAME || env.MYSQL_HOST;
  const port = Number(env.DB_PORT || env.MYSQLPORT || env.MYSQL_PORT || 3306);
  const user = env.DB_USER || env.MYSQLUSER || env.MYSQL_USER;
  const password = env.DB_PASSWORD || env.MYSQLPASSWORD || env.MYSQL_PASSWORD;
  const database = env.DB_NAME || env.MYSQLDATABASE || env.MYSQL_DB || env.MYSQL_DATABASE;
  const sslRequired = (env.DB_SSL_REQUIRED || env.MYSQL_SSL || '').toString().toLowerCase() === 'true';
  return { host, port, user, password, database, sslRequired };
}

function createMysqlPool() {
  const cfg = resolveDbEnv();
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.database) {
    return null;
  }
  return createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: cfg.sslRequired ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
  });
}

const pooled = globalThis.__sbSrvMysqlPool ?? (globalThis.__sbSrvMysqlPool = createMysqlPool());

export function getPool() {
  return pooled;
}
