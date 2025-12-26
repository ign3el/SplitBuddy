# Email Verification URL Configuration Fix

## Problem

When users click the email verification link, they were being redirected to:
- `dev.ign3el.com` instead of `splitbuddy.ign3el.com`
- Taken directly to login page instead of verification success page

## Root Cause

The `VERIFY_PUBLIC_URL` environment variable was pointing to the **frontend URL** instead of the **backend API URL**.

## Solution

The verification link in emails should point to the **backend API endpoint** which serves the verification page, not the frontend.

### Correct URL Structure

- ✅ **Correct**: `https://api.splitbuddy.ign3el.com/api/auth/verify?token=xxx`
- ❌ **Wrong**: `https://dev.ign3el.com/verify-email?token=xxx`
- ❌ **Wrong**: `https://www.splitbuddy.ign3el.com/verify?token=xxx`

## Environment Variables Configuration

### On Your VPS (.env file)

```env
# ===== Backend API Public URL =====
# This is the publicly accessible URL to your backend API
API_PUBLIC_URL=https://api.splitbuddy.ign3el.com

# OR if you're using the same domain with /api proxy:
API_PUBLIC_URL=https://www.splitbuddy.ign3el.com

# ===== Frontend URL =====
# This is where users will be redirected after verification
FRONTEND_URL=https://www.splitbuddy.ign3el.com

# ===== Legacy Variables (optional, API_PUBLIC_URL takes priority) =====
# These can still be set for backward compatibility
VERIFY_PUBLIC_URL=https://api.splitbuddy.ign3el.com
RESET_PUBLIC_URL=https://api.splitbuddy.ign3el.com

# ===== CORS Configuration =====
CORS_ORIGIN=https://www.splitbuddy.ign3el.com
COOKIE_DOMAIN=.splitbuddy.ign3el.com
```

## How It Works Now

### 1. **Email Sent** (Signup/Login)
```
User signs up → Backend sends email with link:
https://api.splitbuddy.ign3el.com/api/auth/verify?token=abc123
```

### 2. **User Clicks Link**
```
Browser opens: https://api.splitbuddy.ign3el.com/api/auth/verify?token=abc123
                ↓
         Backend serves HTML page
                ↓
    "Email Verified!" success page
                ↓
     Button: "Continue to Login"
                ↓
   Redirects to: https://www.splitbuddy.ign3el.com (login page)
```

### 3. **Success Page Features**
- Animated green checkmark ✓
- "Email Verified!" heading
- Clear instructions
- Prominent "Continue to Login" button
- Redirects to `FRONTEND_URL` (www.splitbuddy.ign3el.com)

## Environment Variable Priority

The backend now uses this priority order for verification links:

1. `API_PUBLIC_URL` ← **NEW** (recommended)
2. `VERIFY_PUBLIC_URL` ← Legacy fallback
3. `RESET_PUBLIC_URL` ← Legacy fallback
4. `http://localhost:3003` ← Development default

## Setup for Different Deployment Scenarios

### Scenario 1: Separate Backend API Domain
```env
API_PUBLIC_URL=https://api.splitbuddy.ign3el.com
FRONTEND_URL=https://www.splitbuddy.ign3el.com
```

### Scenario 2: Same Domain with /api Proxy (aaPanel/Nginx)
```env
API_PUBLIC_URL=https://www.splitbuddy.ign3el.com
FRONTEND_URL=https://www.splitbuddy.ign3el.com
```

In this case, nginx should proxy `/api/*` to your backend on port 3003.

### Scenario 3: Development
```env
API_PUBLIC_URL=http://localhost:3003
FRONTEND_URL=http://localhost:5173
```

## Testing

### 1. Check Backend Logs
After restarting, you should see:
```
[Email URLs] API Origin: https://api.splitbuddy.ign3el.com
[Email URLs] VERIFY_PUBLIC_URL: https://api.splitbuddy.ign3el.com
[Email URLs] RESET_PUBLIC_URL: https://api.splitbuddy.ign3el.com
```

### 2. Test Email Link
Sign up a new user and check the verification email. The link should be:
```
https://api.splitbuddy.ign3el.com/api/auth/verify?token=...
```

### 3. Test Verification Page
Click the link → Should show the styled verification success page with:
- SplitBuddy branding
- Green checkmark animation
- "Email Verified!" message
- "Continue to Login" button

### 4. Test Button
Click "Continue to Login" → Should redirect to your frontend login page

## Troubleshooting

### Problem: Email link still goes to wrong domain
**Solution**: 
1. Update `API_PUBLIC_URL` in `.env`
2. Restart backend: `pm2 restart splitbuddy-backend`
3. Check logs to verify correct URL is being used

### Problem: Verification page shows but button doesn't work
**Solution**: 
1. Update `FRONTEND_URL` in `.env`
2. Restart backend
3. The button uses `FRONTEND_URL` for redirection

### Problem: Getting 404 on verification link
**Solution**: 
1. Ensure your backend is accessible at the `API_PUBLIC_URL`
2. Check nginx configuration if using proxy
3. Verify SSL certificates are valid

## Quick Fix Steps

1. **Update .env on VPS**:
   ```bash
   nano ~/.env
   # or
   nano /www/wwwroot/splitbuddy/.env
   ```

2. **Set correct URLs**:
   ```env
   API_PUBLIC_URL=https://api.splitbuddy.ign3el.com
   FRONTEND_URL=https://www.splitbuddy.ign3el.com
   ```

3. **Restart backend**:
   ```bash
   pm2 restart splitbuddy-backend
   # or restart via aaPanel
   ```

4. **Test with new signup**:
   - Create a new test account
   - Check verification email
   - Verify link points to correct domain
   - Test complete flow

## Code Changes Summary

- Added `API_PUBLIC_URL` environment variable
- Changed verification URL construction to use `apiOrigin` instead of `appOrigin`
- Updated all email link generation (signup, login resend, password reset)
- Backend serves styled HTML verification pages
- Verification success page redirects to `FRONTEND_URL`
