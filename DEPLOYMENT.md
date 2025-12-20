# SplitBuddy Deployment Guide

## Problem
The Vercel frontend deployment cannot communicate with the backend API because the backend is not deployed. The frontend is trying to call `/api` endpoints which are unavailable on Vercel.

## Solution (Updated)

✅ **Backend can now be deployed directly to Vercel alongside the frontend!**

The backend has been converted to work as Vercel serverless functions. You can now deploy everything in one place.

## Deployment Steps

### Step 1: Set Environment Variables on Vercel

You need to set these environment variables for your Vercel project:

```bash
vercel env add DB_HOST
# Enter: ign3el-mysql-01-splitbuddy-ign3el.k.aivencloud.com

vercel env add DB_PORT
# Enter: 11497

vercel env add DB_USER
# Enter: avnadmin

vercel env add DB_PASSWORD
# Enter: [Get from your Aiven dashboard]

vercel env add DB_NAME
# Enter: defaultdb

vercel env add DB_SSL_REQUIRED
# Enter: true

vercel env add JWT_SECRET
# Enter: [Generate a random 32-char string, e.g., using: openssl rand -base64 32]

vercel env add CORS_ORIGIN
# Enter: https://splitbuddy-flame.vercel.app

vercel env add MOCK_EMAIL
# Enter: false

vercel env add FRONTEND_URL
# Enter: https://splitbuddy-flame.vercel.app

vercel env add RESET_PUBLIC_URL
# Enter: https://splitbuddy-flame.vercel.app

vercel env add VERIFY_PUBLIC_URL
# Enter: https://splitbuddy-flame.vercel.app
```

**Optional SMTP Settings (for email):**
```bash
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASSWORD
vercel env add SMTP_SECURE
```

### Step 2: Deploy to Vercel

```bash
vercel --prod
```

That's it! Both frontend and backend will be deployed together.

## How It Works

- Frontend is built and served from `/dist`
- Backend API runs as serverless functions at `/api/*`
- All `/api/*` requests are routed to the serverless backend
- MySQL database remains on Aiven Cloud

## Testing

After deployment:

1. **Test API connectivity:**
   - Visit `https://splitbuddy-flame.vercel.app/api/ping`
   - Should return: `{"ok": true, "message": "MySQL reachable", ...}`

2. **Test health endpoint:**
   - Visit `https://splitbuddy-flame.vercel.app/api/health`
   - Should return database status and environment info

3. **Test login from frontend:**
   - Go to https://splitbuddy-flame.vercel.app
   - Try to sign up or login
   - Check browser console (F12 -> Console) for any errors

## Alternative: Deploy Backend Separately (Railway/Render)

1. **Sign up at railway.app**
2. **Create a new project**
3. **Connect your GitHub repository**
4. **Set the Root Directory to `server`**
5. **Add environment variables in Railway:**
   ```
   DB_HOST=ign3el-mysql-01-splitbuddy-ign3el.k.aivencloud.com
   DB_PORT=11497
   DB_USER=avnadmin
   DB_PASSWORD=[Get from your Aiven dashboard]
   DB_NAME=defaultdb
   DB_SSL_REQUIRED=true
   JWT_SECRET=[Generate a random secret]
   CORS_ORIGIN=https://splitbuddy-flame.vercel.app
   PORT=3000
   MOCK_EMAIL=false
   SMTP_HOST=[Your SMTP host]
   SMTP_PORT=587
   SMTP_USER=[Your SMTP user]
   SMTP_PASSWORD=[Your SMTP password]
   SMTP_SECURE=false
   RESET_PUBLIC_URL=[Your Railway backend URL]
   VERIFY_PUBLIC_URL=[Your Railway backend URL]
   FRONTEND_URL=https://splitbuddy-flame.vercel.app
   ```

6. **Railway will generate a public URL** (e.g., `https://splitbuddy-backend-prod.up.railway.app`)

### Option 2: Heroku (Free tier removed, but still viable)

Similar process to Railway but requires credit card.

### Option 3: Render.com

Similar to Railway, free tier available with some limitations.

## Step 2: Update Frontend on Vercel

Once you have the backend URL from Railway (e.g., `https://splitbuddy-backend-prod.up.railway.app`):

1. **Set environment variable on Vercel:**
   ```bash
   vercel env add VITE_API_BASE_URL
   # When prompted, enter: https://splitbuddy-backend-prod.up.railway.app/api
   ```

2. **Or set it in Vercel dashboard:**
   - Go to Vercel Project Settings
   - Environment Variables
   - Add `VITE_API_BASE_URL` with value `https://your-backend-url.railway.app/api`

3. **Redeploy frontend:**
   ```bash
   vercel --prod
   ```

## Testing

After deployment:

1. **Test API connectivity:**
   - Visit `https://your-backend-url.railway.app/api/ping`
   - Should return: `{"ok": true, "message": "MySQL reachable"}`

2. **Test login from frontend:**
   - Go to https://splitbuddy-flame.vercel.app
   - Try to sign up or login
   - Check browser console (F12 -> Console) for any errors
   - Check Network tab to verify API calls are going to your backend URL

## Troubleshooting

### "Cannot reach MySQL"
- Verify MySQL credentials in environment variables
- Check that Aiven firewall allows connections from Railway's IP
- In Aiven dashboard: ACL > Add new rule with Railway's IP

### "CORS errors"
- Update `CORS_ORIGIN` environment variable with your Vercel URL
- Restart backend service

### "Email verification not sending"
- Set `MOCK_EMAIL=false` and provide SMTP credentials
- Or keep `MOCK_EMAIL=true` and check server logs for verification links

## Quick Deployment Checklist

- [ ] Backend deployed to Railway (or similar)
- [ ] MySQL connectivity verified from backend
- [ ] Environment variables set correctly on backend
- [ ] `VITE_API_BASE_URL` set on Vercel
- [ ] Frontend redeployed on Vercel
- [ ] Test login/password reset works
- [ ] Test OCR scanning works
- [ ] Test history storage works
