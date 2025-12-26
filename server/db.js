import { createPool } from 'mysql2/promise';

// Unified MySQL pool with flexible env resolution
function resolveDbEnv() {
  const env = process.env;
  const host = env.DB_HOST || env.MYSQLHOST || env.MYSQLHOSTNAME || env.MYSQL_HOST || 'localhost';
  const port = Number(env.DB_PORT || env.MYSQLPORT || env.MYSQL_PORT || 3306);
  const user = env.DB_USER || env.MYSQLUSER || env.MYSQL_USER || 'root';
  const password = env.DB_PASSWORD || env.MYSQLPASSWORD || env.MYSQL_PASSWORD || '';
  const database = env.DB_NAME || env.MYSQLDATABASE || env.MYSQL_DB || env.MYSQL_DATABASE || 'splitbuddy';
  
  // In production, enforce SSL; in development, allow disabling it
  const isProd = (env.NODE_ENV || '').toLowerCase() === 'production';
  const sslRequired = isProd ? true : (env.DB_SSL_REQUIRED || env.DB_SSL || '').toString().toLowerCase() === 'true';
  
  return { host, port, user, password, database, sslRequired };
}

function createMysqlPool() {
  const cfg = resolveDbEnv();
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  
  console.log(`[DB] Creating pool with host: ${cfg.host}:${cfg.port}`);
  
  try {
    const poolConfig = {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl: cfg.sslRequired ? { rejectUnauthorized: !isProd } : undefined,
      waitForConnections: true,
      connectionLimit: isProd ? 20 : 10,
      enableKeepAlive: true,
      connectTimeout: 10000,
    };

    if (isProd) {
      console.log(`[DB] Production mode: SSL ${cfg.sslRequired ? 'enabled' : 'disabled'}`);
    } else {
      console.log(`[DB] Development mode: SSL ${cfg.sslRequired ? 'enabled' : 'disabled'}`);
    }

    return createPool(poolConfig);
  } catch (err) {
    console.error('[DB] Pool creation failed:', err.message);
    return null;
  }
}

// Lazy initialization - pool is only created when first accessed
let pooled = null;

export function getPool() {
  if (!pooled) {
    pooled = createMysqlPool();
  }
  return pooled;
}

// Optional named export for modules expecting `pool`
export const pool = getPool();
