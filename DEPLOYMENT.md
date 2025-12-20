# SplitBuddy Deployment Guide

## Problem
The Vercel frontend deployment cannot communicate with the backend API because the backend is not deployed. The frontend is trying to call `/api` endpoints which are unavailable on Vercel.

## Architecture
- **Frontend**: React app deployed on Vercel
- **Backend**: Node.js/Express server (currently only running locally)
- **Database**: MySQL hosted on Aiven Cloud

## Solution

You need to deploy the backend server to a hosting service that can run Node.js servers. Here are the recommended options:

### Option 1: Railway.app (Recommended - Easiest)

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
