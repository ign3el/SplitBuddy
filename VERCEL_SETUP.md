# Quick Vercel Deployment - Environment Variables

Run these commands to set up environment variables on Vercel:

```bash
# Database configuration (from Aiven)
echo "ign3el-mysql-01-splitbuddy-ign3el.k.aivencloud.com" | vercel env add DB_HOST production
echo "11497" | vercel env add DB_PORT production
echo "avnadmin" | vercel env add DB_USER production
echo "YOUR_AIVEN_PASSWORD_HERE" | vercel env add DB_PASSWORD production
echo "defaultdb" | vercel env add DB_NAME production
echo "true" | vercel env add DB_SSL_REQUIRED production

# JWT Secret (generate random: openssl rand -base64 32)
echo "YOUR_JWT_SECRET_HERE" | vercel env add JWT_SECRET production

# CORS and URLs
echo "https://splitbuddy-flame.vercel.app" | vercel env add CORS_ORIGIN production
echo "https://splitbuddy-flame.vercel.app" | vercel env add FRONTEND_URL production
echo "https://splitbuddy-flame.vercel.app" | vercel env add RESET_PUBLIC_URL production
echo "https://splitbuddy-flame.vercel.app" | vercel env add VERIFY_PUBLIC_URL production

# Email settings (optional - set to true for mock emails)
echo "true" | vercel env add MOCK_EMAIL production

# Deploy
vercel --prod
```

## After Setting Variables

The backend will be accessible at:
- `https://splitbuddy-flame.vercel.app/api/ping`
- `https://splitbuddy-flame.vercel.app/api/health`
- All other `/api/*` endpoints

## Required Values You Need:

1. **DB_PASSWORD**: Get from Aiven dashboard → Your MySQL service → Connection information
2. **JWT_SECRET**: Generate with: `openssl rand -base64 32` (or any 32+ character random string)

## Quick Test

After deployment:
```bash
curl https://splitbuddy-flame.vercel.app/api/ping
```

Should return: `{"ok":true,"message":"MySQL reachable",...}`
