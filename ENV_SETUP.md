# Development vs Production Environment Setup

## Overview
SplitBuddy backend now supports distinct **development** and **production** environments with automated configuration switching.

---

## Directory Structure

```
server/
├── .env                    # Local (git-ignored, never commit)
├── .env.development        # Template for local development
├── .env.production         # Template for production VPS
├── .env.example            # Documentation template
├── db.js                   # Database pool with NODE_ENV-aware SSL
├── ecosystem.config.js     # PM2 configuration (root level)
├── index.js                # Entry point
├── package.json            # Scripts with cross-env
└── ...other files
```

---

## Development Environment (Local)

### Setup

1. **Copy template to local env:**
   ```bash
   cd server
   cp .env.development .env
   ```

2. **Edit `.env` with your local credentials:**
   ```dotenv
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=ign3el
   DB_PASSWORD=Bhilai-9
   DB_NAME=splitbuddy
   DB_SSL=false  # Disabled for localhost
   
   CORS_ORIGIN=http://localhost:5173
   PORT=3003
   
   EMAIL_SERVICE=gmail
   EMAIL_USER=sahtesham@gmail.com
   EMAIL_PASSWORD=jpvc hxon zmvr orwb
   EMAIL_FROM="SplitBuddy <info@ign3el.com>"
   MOCK_EMAIL=false  # Or true to log instead of sending
   ```

3. **Run locally with nodemon (auto-reload on changes):**
   ```bash
   npm run dev
   ```
   
   **Output:**
   ```
   > cross-env NODE_ENV=development nodemon index.js
   [nodemon] 3.1.11 watching path(s): *.*
   [DB] Development mode: SSL disabled
   ✓ Database pool initialized
   SplitBuddy server listening on http://0.0.0.0:3003
   ```

4. **Alternative: Use native Node watch without nodemon:**
   ```bash
   npm run dev:watch
   ```

---

## Production Environment (VPS)

### Setup

1. **Create production env on VPS:**
   ```bash
   cd /var/www/splitbuddy/server
   cp .env.production .env
   ```

2. **Edit `.env` with VPS credentials:**
   ```dotenv
   NODE_ENV=production
   DB_HOST=your_vps_db_host
   DB_PORT=3306
   DB_USER=prod_user
   DB_PASSWORD=your_secure_password
   DB_NAME=splitbuddy_prod
   DB_SSL=true  # Enforced for production
   
   CORS_ORIGIN=https://www.splitbuddy.ign3el.com
   PORT=3003
   
   EMAIL_SERVICE=gmail
   EMAIL_USER=sahtesham@gmail.com
   EMAIL_PASSWORD=your_gmail_app_password
   EMAIL_FROM="SplitBuddy <info@ign3el.com>"
   MOCK_EMAIL=false
   
   RESET_PUBLIC_URL=https://www.splitbuddy.ign3el.com/reset
   VERIFY_PUBLIC_URL=https://www.splitbuddy.ign3el.com/verify
   FRONTEND_URL=https://www.splitbuddy.ign3el.com
   ```

3. **Start with PM2 (recommended):**
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start the app using ecosystem config
   pm2 start ecosystem.config.js --env production
   
   # Save PM2 process list
   pm2 save
   
   # Enable startup on reboot
   pm2 startup
   ```

4. **Alternative: Direct start (without PM2):**
   ```bash
   npm start
   ```
   
   **Output:**
   ```
   > cross-env NODE_ENV=production node index.js
   [DB] Production mode: SSL enabled
   ✓ Database pool initialized
   SplitBuddy server listening on http://0.0.0.0:3003
   ```

---

## Environment-Specific Behavior

### Database SSL

| Env | DB_SSL Setting | Result | Use Case |
|-----|---|---|---|
| **development** | `false` | SSL disabled (localhost) | Fast local iteration |
| **production** | `true` (enforced) | SSL enabled, strict certs | Secure VPS connection |

**Code:** See `server/db.js` → `resolveDbEnv()` and `createMysqlPool()`

```javascript
const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const sslRequired = isProd ? true : (env.DB_SSL_REQUIRED || env.DB_SSL || '').toString().toLowerCase() === 'true';
```

### Connection Pooling

| Env | Connection Limit | Rationale |
|-----|---|---|
| **development** | 10 | Low load, sufficient for testing |
| **production** | 20 | Higher concurrency, handle traffic |

---

## Scripts Reference

### `npm run dev`
- **Sets:** `NODE_ENV=development`
- **Runner:** `nodemon` (auto-restarts on file changes)
- **Use:** Local development with hot-reload
- **Example:**
  ```bash
  cd server
  npm run dev
  # Edit a file → nodemon auto-restarts
  ```

### `npm run dev:watch`
- **Sets:** `NODE_ENV=development`
- **Runner:** Native Node.js `--watch` flag
- **Use:** Alternative to nodemon if preferred
- **Example:**
  ```bash
  npm run dev:watch
  ```

### `npm start`
- **Sets:** `NODE_ENV=production`
- **Runner:** Plain `node` (no watch)
- **Use:** Production VPS or final testing
- **Example:**
  ```bash
  npm start
  # Silent startup, logs to files if PM2 is used
  ```

---

## PM2 Management (VPS)

### Start/Stop
```bash
# Start all processes from ecosystem config
pm2 start ecosystem.config.js --env production

# List running processes
pm2 list

# Stop all
pm2 stop all

# Restart all
pm2 restart all

# Stop and delete
pm2 delete all
```

### Logs
```bash
# View real-time logs
pm2 logs splitbuddy-backend

# View error logs only
pm2 logs splitbuddy-backend --err

# View old logs
cat logs/pm2-error.log
cat logs/pm2-out.log
cat logs/pm2-combined.log
```

### Clustering
The ecosystem config uses `exec_mode: 'cluster'` with `instances: 'max'`, which:
- Spawns one process per CPU core
- Distributes load across cores
- Auto-restarts crashed processes
- Graceful shutdown on SIGTERM

---

## Git Safety

### `.env` files are ignored:
```
.env
.env.local
.env.development.local
.env.production.local
server/.env
server/.env.local
```

### Why:
- Prevents accidental commits of credentials
- Keeps database passwords, JWT secrets, API keys safe
- Each environment has its own `.env` (not in git)

### Verify:
```bash
git status  # Should NOT show .env files
git check-ignore server/.env  # Should return: server/.env
```

---

## Troubleshooting

### "DB_SSL=false not working in production"
- **Fix:** Code enforces `DB_SSL=true` when `NODE_ENV=production`
- Check: `server/db.js` line: `const isProd = ... === 'production'`

### "Cross-env not found"
- **Fix:** `npm install` (already done in server/)
- Windows-specific: cross-env handles `NODE_ENV=...` syntax

### "Nodemon not restarting files"
- **Fix:** Edit `nodemon.json` or use `--ignore` flag
- Default: watches all `*.js` files, ignores `node_modules`

### "Port 3003 already in use"
- **Fix:** Kill process: `Get-Process node | Stop-Process -Force`
- Or change `PORT=` in `.env`

---

## Summary

| Task | Command | ENV |
|------|---------|-----|
| Dev with auto-reload | `npm run dev` | development |
| Prod test locally | `npm start` | production |
| Prod on VPS | `npm install && pm2 start ecosystem.config.js` | production |

---

## Next Steps

1. ✅ Verify both `npm run dev` and `npm start` work
2. ✅ Commit `.env.example` and `ecosystem.config.js` to git
3. ✅ Ensure `.env` files are in `.gitignore`
4. 📋 On VPS: Copy `.env.production` → `.env` with real credentials
5. 📋 On VPS: Install PM2 and start with `pm2 start ecosystem.config.js`
