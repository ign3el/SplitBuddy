// Express app export for both local and Vercel serverless
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SSL_REQUIRED,
  JWT_SECRET,
  CORS_ORIGIN,
  MOCK_EMAIL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_SECURE,
  EMAIL_SERVICE,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASSWORD,
  EMAIL_FROM,
  RESET_PUBLIC_URL,
  VERIFY_PUBLIC_URL,
  FRONTEND_URL
} = process.env;

// Allow flexible env check for serverless
const hasRequiredEnv = DB_HOST && DB_PORT && DB_USER && DB_PASSWORD && DB_NAME && JWT_SECRET;
const isDev = process.env.NODE_ENV === 'development';
if (!hasRequiredEnv && !isDev) {
  console.warn('Missing required env vars. Server may not function correctly.');
}

let pool;
try {
  pool = getPool();
  if (!pool) {
    console.error('✗ Pool is null - database credentials may be invalid');
  } else {
    console.log('✓ Database pool initialized');
    console.log(`[DB] Connecting to ${DB_HOST}:${DB_PORT}/${DB_NAME} as ${DB_USER}`);
  }
  
  // Test the connection immediately
  if (pool) {
    try {
      const conn = await pool.getConnection();
      const [result] = await conn.query('SELECT 1 as ok');
      conn.release();
      console.log('✓ Database connection verified - MySQL is reachable');
    } catch (err) {
      console.error('✗ Database connection test failed:', err.message);
      console.error('[DB] Code:', err.code, 'SQLState:', err.sqlState);
      if (isDev) {
        console.warn('⚠ Running in development mode - will attempt to continue');
      } else {
        throw err;
      }
    }
  }
} catch (err) {
  console.error('✗ Database initialization failed:', err.message);
  if (!isDev) {
    throw err;
  }
  console.warn('⚠ Running in development mode without database - API endpoints will return errors');
  pool = null;
}

const brand = {
  primary: '#10b981',
  text: '#0f172a',
  muted: '#64748b',
  bg: '#f0fdf4',
};

const appOrigin = VERIFY_PUBLIC_URL || RESET_PUBLIC_URL || 'http://localhost:3003';
console.log('[Email URLs] appOrigin:', appOrigin);
console.log('[Email URLs] VERIFY_PUBLIC_URL:', VERIFY_PUBLIC_URL);
console.log('[Email URLs] RESET_PUBLIC_URL:', RESET_PUBLIC_URL);

let transporter = null;
if (MOCK_EMAIL !== 'true') {
  // Prefer EMAIL_* vars when provided; fallback to SMTP_*
  const host = EMAIL_HOST || SMTP_HOST;
  const port = Number(EMAIL_PORT || SMTP_PORT || 587);
  const secure = (SMTP_SECURE === 'true');
  const user = EMAIL_USER || SMTP_USER;
  const pass = EMAIL_PASSWORD || SMTP_PASSWORD;
  if (EMAIL_SERVICE && user && pass) {
    transporter = nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: { user, pass },
    });
  } else if (host) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }
}

const DEFAULT_FROM = EMAIL_FROM || SMTP_USER || 'no-reply@splitbuddy.local';

function renderEmail({ title, intro, ctaUrl, ctaLabel, footer }) {
  return `<!doctype html>
  <html><body style="margin:0;padding:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:${brand.bg};color:${brand.text}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(16,185,129,0.18);overflow:hidden">
        <tr><td style="padding:24px 28px 8px 28px;border-bottom:1px solid #e2e8f0">
          <div style="font-size:18px;font-weight:700;color:${brand.primary};">SplitBuddy</div>
        </td></tr>
        <tr><td style="padding:20px 28px 8px 28px;font-size:20px;font-weight:700;">${title}</td></tr>
        <tr><td style="padding:0 28px 16px 28px;font-size:15px;line-height:1.6;color:${brand.text}">${intro}</td></tr>
        <tr><td style="padding:0 28px 24px 28px">
          <a href="${ctaUrl}" style="display:inline-block;background:${brand.primary};color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:0 28px 28px 28px;font-size:13px;color:${brand.muted};line-height:1.5">${footer}</td></tr>
      </table>
      <div style="font-size:12px;color:${brand.muted};padding:12px 0 0">If you didn't request this, you can ignore this email.</div>
    </td></tr>
  </table>
  </body></html>`;
}

function buildResetEmail(resetUrl) {
  return renderEmail({
    title: 'Reset your password',
    intro: 'We received a request to reset your SplitBuddy password. Click the button below to set a new password.',
    ctaUrl: resetUrl,
    ctaLabel: 'Reset Password',
    footer: 'This link expires in 30 minutes.',
  });
}

function buildVerificationEmail(verifyUrl) {
  return renderEmail({
    title: 'Confirm your email',
    intro: 'Welcome to SplitBuddy! Please confirm your email to activate your account and start splitting receipts.',
    ctaUrl: verifyUrl,
    ctaLabel: 'Verify Email',
    footer: 'The link expires in 24 hours.',
  });
}

function buildVerifiedEmail(frontendUrl) {
  const dest = frontendUrl || FRONTEND_URL || 'http://localhost:5173';
  return renderEmail({
    title: 'Email verified ✓',
    intro: 'You are all set! Your email is now verified. You can log in and continue splitting receipts.',
    ctaUrl: dest,
    ctaLabel: 'Open SplitBuddy',
    footer: 'If you did not create this account, please reset your password immediately.',
  });
}

async function sendEmail({ to, subject, html }) {
  if (!to) return;
  if (MOCK_EMAIL === 'true' || !transporter) {
    console.log(`[MOCK EMAIL] ${subject}:`, to, '\n', html.match(/https?:\/\/[^\s"']+/)?.[0]);
    return;
  }
  await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject,
    html,
  });
}

async function issueVerificationToken(conn, userId) {
  const token = uuidv4().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await conn.query('INSERT INTO email_verifications (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)', [token, userId, expiresAt]);
  return token;
}

async function ensureSchema() {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS profiles (
        user_id VARCHAR(36) PRIMARY KEY,
        is_pro TINYINT(1) NOT NULL DEFAULT 0,
        scans_used_this_month INT NOT NULL DEFAULT 0,
        max_scans_per_month INT NOT NULL DEFAULT 5,
        month_reset_date DATETIME NOT NULL,
        CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        token VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_resets_user (user_id),
        CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS email_verifications (
        token VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_verifications_user (user_id),
        CONSTRAINT fk_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS bills (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bills_user (user_id),
        CONSTRAINT fk_bills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS splits (
        id VARCHAR(36) PRIMARY KEY,
        bill_id VARCHAR(36) NOT NULL,
        participant VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_splits_bill (bill_id),
        CONSTRAINT fk_splits_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS split_history (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        split_date DATETIME NOT NULL,
        participant_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        detailed_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_history_user (user_id),
        INDEX idx_history_date (split_date),
        CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`
    ];

    for (const statement of schemaStatements) {
      await conn.query(statement);
    }
    const [colRows] = await conn.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = 'is_verified'
    `);
    const hasCol = Array.isArray(colRows) && colRows[0]?.cnt > 0;
    if (!hasCol) {
      await conn.query('ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0');
    }
  } finally {
    conn.release();
  }
}

const app = express();
app.use(express.json());

// CORS configuration: allow localhost, 127.0.0.1, and network IPs in dev; strict in prod
function getCorsOrigin() {
  const isDev = (process.env.NODE_ENV || '').toLowerCase() !== 'production';
  if (isDev) {
    // In development, accept any origin that looks like localhost or a network address
    return function (origin, callback) {
      const allowedPatterns = [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        /^http:\/\/192\.168\.([\d.]+)(:\d+)?$/,
        /^http:\/\/10\.([\d.]+)(:\d+)?$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[01])\.([\d.]+)(:\d+)?$/,
      ];
      const isAllowed = !origin || allowedPatterns.some(pattern => pattern.test(origin));
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    };
  } else {
    // In production, use the configured CORS_ORIGIN
    return CORS_ORIGIN || 'https://www.splitbuddy.ign3el.com';
  }
}

app.use(cors({ 
  origin: getCorsOrigin(),
  credentials: true 
}));

app.get('/api/ping', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok: false, message: 'Database not configured' });
  try {
    // Simple connection test with 5 second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    const connPromise = pool.getConnection();
    const conn = await Promise.race([connPromise, timeoutPromise]);
    await conn.query('SELECT 1');
    conn.release();
    res.json({ ok: true, message: 'MySQL reachable', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.get('/api/health', async (_req, res) => {
  if (!pool) return res.status(503).json({ status: 'unhealthy', database: 'not_configured' });
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT 1');
    conn.release();
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME
      }
    });
  } catch (e) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: e.message,
      code: e.code
    });
  }
});

app.get('/api/db-test', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok: false, error: 'Database pool not initialized' });
  try {
    // Test basic connectivity
    const conn = await pool.getConnection();
    const [testResult] = await conn.query('SELECT 1 as test');
    
    // Check if users table exists
    const [tableCheck] = await conn.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name IN ('users', 'profiles', 'bills', 'splits', 'split_history')
    `);
    
    // Get row counts
    const [counts] = await conn.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM profiles) as profile_count,
        (SELECT COUNT(*) FROM bills) as bill_count,
        (SELECT COUNT(*) FROM splits) as split_count,
        (SELECT COUNT(*) FROM split_history) as history_count
    `);
    
    conn.release();
    
    res.json({
      ok: true,
      connectivity: 'verified',
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      testQuery: testResult,
      tables: {
        configured: tableCheck[0]?.table_count || 0,
        expected: 5
      },
      rows: counts[0] || {},
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message,
      code: e.code,
      sqlState: e.sqlState
    });
  }
});

function authMiddleware(req, res, next) {
  if (!JWT_SECRET) return res.status(500).json({ error: 'JWT not configured' });
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/auth/signup', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { email, name, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  try {
    const [existsRows] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (Array.isArray(existsRows) && existsRows.length) {
      return res.status(409).json({ error: 'Email already registered. Please log in.' });
    }

    await conn.query('INSERT INTO users (id, email, name, password_hash, is_verified) VALUES (?, ?, ?, ?, 0)', [id, email, name || null, hash]);
    await conn.query('INSERT INTO profiles (user_id, is_pro, scans_used_this_month, max_scans_per_month, month_reset_date) VALUES (?, 0, 0, 5, ?)', [id, new Date()]);

    const token = await issueVerificationToken(conn, id);
    const verifyUrl = `${appOrigin}/verify?token=${token}`;
    await sendEmail({ to: email, subject: 'Verify your SplitBuddy email', html: buildVerificationEmail(verifyUrl) });

    res.status(201).json({ message: 'Verification email sent. Please verify before logging in.', requiresVerification: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: e.message });
    }
  } finally {
    conn.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const conn = await pool.getConnection();
  try {
    // Do not select created_at explicitly to support older DBs without this column
    const [rows] = await conn.query('SELECT id, email, name, password_hash, is_verified FROM users WHERE email = ?', [email]);
    const user = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_verified) {
      // Check if a verification email was sent recently (within last 3 minutes)
      // email_verifications table lacks created_at; approximate created time as expires_at - 30m (token lifetime)
      const [recentTokens] = await conn.query(
        'SELECT expires_at FROM email_verifications WHERE user_id = ? AND used = 0 ORDER BY expires_at DESC LIMIT 1',
        [user.id]
      );
      const recentToken = Array.isArray(recentTokens) && recentTokens.length ? recentTokens[0] : null;
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      if (recentToken?.expires_at) {
        const createdApprox = new Date(new Date(recentToken.expires_at).getTime() - 24 * 60 * 60 * 1000); // expires_at is 24h after creation
        if (createdApprox > threeMinutesAgo) {
          // Verification email was sent recently, don't send another one
          return res.status(429).json({ error: 'Verification email was recently sent. Please check your email or try again in 3 minutes.' });
        }
      }
      
      // Send new verification email
      const token = await issueVerificationToken(conn, user.id);
      const verifyUrl = `${appOrigin}/verify?token=${token}`;
      await sendEmail({ to: user.email, subject: 'Verify your SplitBuddy email', html: buildVerificationEmail(verifyUrl) });
      return res.status(403).json({ error: 'Email not verified. Verification email sent.' });
    }
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const [pRows] = await conn.query('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
    const profile = Array.isArray(pRows) && pRows.length ? pRows[0] : null;
    const createdAtIso = user.created_at ? new Date(user.created_at).toISOString() : undefined;
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, createdAt: createdAtIso }, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.post('/api/auth/request-reset', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id, email, name FROM users WHERE email = ?', [email]);
    const user = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!user) return res.status(200).json({ ok: true });
    const token = uuidv4().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await conn.query('INSERT INTO password_resets (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)', [token, user.id, expiresAt]);

    const resetUrl = `${appOrigin}/reset?token=${token}`;
    await sendEmail({ to: user.email, subject: 'Reset your SplitBuddy password', html: buildResetEmail(resetUrl) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.get('/reset', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reset Password · SplitBuddy</title>
  <style>
    body{font-family:system-ui,Segoe UI,Arial;background:${brand.bg};padding:24px;color:${brand.text}}
    .card{max-width:520px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(16,185,129,.18);padding:28px}
    .btn{background:${brand.primary};color:#fff;border:none;padding:12px 16px;border-radius:10px;cursor:pointer;font-weight:700}
    .input{width:100%;padding:12px;border:1px solid #d1fae5;border-radius:10px}
    label{display:block;margin:14px 0 6px;font-weight:600}
    .error{color:#b91c1c;font-size:13px;margin-top:6px;display:none}
  </style>
  </head><body><div class="card"><h2>Reset Your Password</h2>
  <form id="reset-form" method="post" action="/api/auth/reset">
    <input type="hidden" name="token" value="${token}">
    <label>New Password</label>
    <input class="input" type="password" name="password" id="pw" required minlength="8" autocomplete="new-password">
    <label>Confirm New Password</label>
    <input class="input" type="password" id="pw2" required minlength="8" autocomplete="new-password">
    <div class="error" id="err">Passwords do not match.</div>
    <div style="margin-top:16px"><button class="btn" type="submit">Set New Password</button></div>
  </form>
  <script>
    const form = document.getElementById('reset-form');
    const pw = document.getElementById('pw');
    const pw2 = document.getElementById('pw2');
    const err = document.getElementById('err');
    form.addEventListener('submit', (e) => {
      if (pw.value !== pw2.value) {
        e.preventDefault();
        err.style.display = 'block';
        pw2.focus();
      }
    });
  </script>
  </div></body></html>`);
});

app.post('/api/auth/reset', express.urlencoded({ extended: true }), async (req, res) => {
  if (!pool) return res.status(503).send('Database not configured');
  const token = req.body.token || req.body?.token;
  const password = req.body.password || req.body?.password;
  if (!token || !password) return res.status(400).send('Missing token or password');
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT token, user_id, expires_at, used FROM password_resets WHERE token = ?', [token]);
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!row) return res.status(400).send('Invalid token');
    if (row.used) return res.status(400).send('Token already used');
    if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).send('Token expired');
    const hash = await bcrypt.hash(password, 10);
    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
    await conn.query('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);
    res.setHeader('Content-Type', 'text/html');
    res.send('<p>Password updated successfully. You can close this page and log in.</p>');
  } catch (e) {
    res.status(500).send('Server error');
  } finally {
    conn.release();
  }
});

app.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html>
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Verify Email · SplitBuddy</title>
  <style>
    :root { --green:${brand.primary}; --bg:${brand.bg}; --text:${brand.text}; --muted:${brand.muted}; }
    body { margin:0; padding:32px 16px; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background: var(--bg); color: var(--text); }
    .shell { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 12px 50px rgba(16,185,129,0.22); overflow:hidden; }
    .hero { padding: 28px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0)); }
    .brand { font-weight: 800; color: var(--green); font-size: 20px; letter-spacing: -0.2px; }
    .content { padding: 28px; text-align: center; }
    h1 { margin: 0 0 10px; font-size: 24px; }
    p { margin: 8px 0; color: var(--muted); line-height: 1.6; }
    .btn { display: inline-block; background: var(--green); color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 700; margin-top: 12px; border: none; cursor: pointer; }
    .hint { font-size: 13px; color: var(--muted); margin-top: 12px; }
  </style>
  </head><body>
    <div class="shell">
      <div class="hero"><div class="brand">SplitBuddy</div></div>
      <div class="content">
        <h1>Verify your email</h1>
        <p>Click below to confirm your account and start splitting receipts.</p>
        <form method="get" action="/api/auth/verify">
          <input type="hidden" name="token" value="${token}">
          <button class="btn" type="submit">Complete Verification</button>
        </form>
        <div class="hint">Having trouble? Copy and paste this link into your browser.</div>
      </div>
    </div>
  </body></html>`);
});

app.get('/api/auth/verify', async (req, res) => {
  if (!pool) return res.status(503).send('Database not configured');
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT token, user_id, expires_at, used FROM email_verifications WHERE token = ?', [token]);
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!row) return res.status(400).send('Invalid token');
    if (row.used) return res.status(400).send('Token already used');
    if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).send('Token expired');
    const [uRows] = await conn.query('SELECT email, name FROM users WHERE id = ?', [row.user_id]);
    const user = Array.isArray(uRows) && uRows.length ? uRows[0] : null;
    
    // Mark user as verified
    const updateResult = await conn.query('UPDATE users SET is_verified = 1 WHERE id = ?', [row.user_id]);
    console.log(`[Email Verification] Updated user ${row.user_id} is_verified status`);
    
    // Mark token as used
    await conn.query('UPDATE email_verifications SET used = 1 WHERE token = ?', [token]);
    console.log(`[Email Verification] Marked token ${token} as used`);
    
    if (user?.email) {
      const html = buildVerifiedEmail(FRONTEND_URL);
      await sendEmail({ to: user.email, subject: 'Your email is verified', html });
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!doctype html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Verified · SplitBuddy</title>
    <style>
      :root { --green:${brand.primary}; --bg:${brand.bg}; --text:${brand.text}; --muted:${brand.muted}; }
      body { margin:0; padding:32px 16px; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background: var(--bg); color: var(--text); }
      .shell { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 14px 60px rgba(16,185,129,0.22); overflow:hidden; text-align:center; }
      .hero { padding: 30px; background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0)); border-bottom:1px solid #e2e8f0; }
      .brand { font-weight: 800; color: var(--green); font-size: 20px; letter-spacing: -0.2px; }
      .content { padding: 30px; }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { margin: 8px 0; color: var(--muted); line-height: 1.6; }
      .btn { display:inline-block; background: var(--green); color:#fff; padding:12px 18px; border-radius:12px; text-decoration:none; font-weight:700; margin-top:14px; }
    </style>
    </head><body>
      <div class="shell">
        <div class="hero"><div class="brand">SplitBuddy</div></div>
        <div class="content">
          <h1>All set!</h1>
          <p>Your email has been verified. You can now log in and continue.</p>
          <a class="btn" href="${FRONTEND_URL || 'http://localhost:5173'}">Open SplitBuddy</a>
        </div>
      </div>
    </body></html>`);
  } catch (e) {
    res.status(500).send('Server error');
  } finally {
    conn.release();
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.userId]);
    const user = Array.isArray(rows) && rows.length ? rows[0] : null;
    const [pRows] = await conn.query('SELECT * FROM profiles WHERE user_id = ?', [req.userId]);
    const profile = Array.isArray(pRows) && pRows.length ? pRows[0] : null;
    res.json({ user, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.put('/api/profiles', authMiddleware, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { name } = req.body || {};
  const conn = await pool.getConnection();
  try {
    if (name !== undefined) {
      await conn.query('UPDATE users SET name = ? WHERE id = ?', [name, req.userId]);
    }
    const [rows] = await conn.query('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.userId]);
    const [pRows] = await conn.query('SELECT * FROM profiles WHERE user_id = ?', [req.userId]);
    res.json({ user: Array.isArray(rows) && rows.length ? rows[0] : null, profile: Array.isArray(pRows) && pRows.length ? pRows[0] : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.post('/api/profiles/scans/increment', authMiddleware, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const conn = await pool.getConnection();
  try {
    const [pRows] = await conn.query('SELECT scans_used_this_month, max_scans_per_month, month_reset_date, is_pro FROM profiles WHERE user_id = ?', [req.userId]);
    const profile = Array.isArray(pRows) && pRows.length ? pRows[0] : null;
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastReset = new Date(profile.month_reset_date);
    let scans = profile.scans_used_this_month;
    
    if (now >= firstOfMonth && lastReset < firstOfMonth) {
      scans = 0;
      await conn.query('UPDATE profiles SET scans_used_this_month = 0, month_reset_date = ? WHERE user_id = ?', [now, req.userId]);
    }
    
    if (profile.is_pro) {
      await conn.query('UPDATE profiles SET scans_used_this_month = scans_used_this_month + 1 WHERE user_id = ?', [req.userId]);
      return res.json({ allowed: true, scans_used_this_month: scans + 1, max_scans_per_month: -1 });
    }
    
    if (scans >= profile.max_scans_per_month) {
      return res.json({ allowed: false, scans_used_this_month: scans, max_scans_per_month: profile.max_scans_per_month });
    }
    scans += 1;
    await conn.query('UPDATE profiles SET scans_used_this_month = ? WHERE user_id = ?', [scans, req.userId]);
    res.json({ allowed: true, scans_used_this_month: scans, max_scans_per_month: profile.max_scans_per_month });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.post('/api/history/splits', authMiddleware, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { records, detailedSplit } = req.body || {};
  if (!Array.isArray(records) || !detailedSplit) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  const conn = await pool.getConnection();
  try {
    for (const record of records) {
      const id = uuidv4();
      await conn.query(
        'INSERT INTO split_history (id, user_id, split_date, participant_name, amount, detailed_data) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.userId, new Date(record.date), record.name, record.amount, JSON.stringify(detailedSplit)]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.get('/api/history/splits', authMiddleware, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, split_date, participant_name, amount, detailed_data FROM split_history WHERE user_id = ? ORDER BY split_date DESC',
      [req.userId]
    );
    const records = (Array.isArray(rows) ? rows : []).map(row => ({
      name: row.participant_name,
      amount: parseFloat(row.amount),
      date: new Date(row.split_date).toISOString(),
    }));
    
    const detailedSplits = [];
    const seen = new Set();
    for (const row of (Array.isArray(rows) ? rows : [])) {
      if (row.detailed_data) {
        try {
          const parsed = JSON.parse(row.detailed_data);
          const key = parsed.date;
          if (!seen.has(key)) {
            seen.add(key);
            detailedSplits.push(parsed);
          }
        } catch {}
      }
    }
    
    res.json({ records, detailedSplits });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/history/splits', authMiddleware, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM split_history WHERE user_id = ?', [req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords required' });
  }
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
    const user = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
    
    const hash = await bcrypt.hash(newPassword, 10);
    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.userId]);
    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// Initialize database schema
if (pool) {
  ensureSchema().catch(err => console.error('Schema setup error:', err));
}

// SERVE FRONTEND: Serve static files from dist folder (for production Docker container)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// CATCH-ALL: Send all other requests to index.html (important for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

export default app;
export { ensureSchema, pool };
