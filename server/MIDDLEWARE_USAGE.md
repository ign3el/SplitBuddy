# JWT Verify Middleware - Usage Guide

## Overview
The `authMiddleware` function protects private routes by verifying JWT tokens from HTTP-only cookies or Authorization headers.

## Middleware Implementation

Located in `server/app.js` (lines ~442-477):

```javascript
function authMiddleware(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT not configured' });
  }
  
  // Check for token in HTTP-only cookie first (primary method)
  let token = req.cookies?.token;
  
  // Fallback to Authorization header for API clients
  if (!token) {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      token = header.slice(7);
    }
  }
  
  // Return 401 if no token found
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }
  
  try {
    // Verify and decode the JWT token
    const payload = jwt.verify(token, JWT_SECRET);
    
    // Attach user data to request object
    req.user = { id: payload.sub };
    req.userId = payload.sub; // Keep for backward compatibility
    
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}
```

## How It Works

1. **Cookie-First Approach**: Checks for `token` cookie (HTTP-only)
2. **Header Fallback**: Falls back to `Authorization: Bearer <token>` header
3. **JWT Verification**: Uses `JWT_SECRET` from `.env` to verify token
4. **User Attachment**: Attaches decoded user data to `req.user` and `req.userId`
5. **Error Handling**: Returns 401 for missing/invalid tokens

## Applying Middleware to Routes

### Single Protected Route

```javascript
// Protect /api/me endpoint
app.get('/api/me', authMiddleware, async (req, res) => {
  // Access authenticated user ID via req.user.id or req.userId
  const userId = req.user.id;
  
  const [rows] = await conn.query('SELECT * FROM users WHERE id = ?', [userId]);
  res.json({ user: rows[0] });
});
```

### Multiple Protected Routes

```javascript
// Protect multiple profile endpoints
app.get('/api/profiles', authMiddleware, async (req, res) => { /* ... */ });
app.put('/api/profiles', authMiddleware, async (req, res) => { /* ... */ });
app.delete('/api/profiles', authMiddleware, async (req, res) => { /* ... */ });
```

### Group Protection (Express Router)

```javascript
import express from 'express';
const protectedRouter = express.Router();

// Apply middleware to all routes in this router
protectedRouter.use(authMiddleware);

protectedRouter.get('/dashboard', (req, res) => {
  res.json({ userId: req.user.id });
});

protectedRouter.get('/settings', (req, res) => {
  res.json({ userId: req.user.id });
});

app.use('/api/protected', protectedRouter);
```

## Login Controller - Cookie Setup

Located in `server/app.js` (lines ~545-575):

```javascript
app.post('/api/auth/login', async (req, res) => {
  // ... validation and user lookup ...
  
  // Generate JWT token
  const jwtToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  
  // Cookie configuration for splitbuddy.ign3el.com domain
  const cookieOptions = {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // Cross-subdomain compatibility
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  };
  
  // Add domain for production (works across subdomains)
  if (process.env.NODE_ENV === 'production' && COOKIE_DOMAIN) {
    cookieOptions.domain = COOKIE_DOMAIN; // e.g., '.splitbuddy.ign3el.com'
  }
  
  // Set HTTP-only cookie named 'token'
  res.cookie('token', jwtToken, cookieOptions);
  
  // Also return token in response body for localStorage fallback
  res.json({ 
    token: jwtToken, 
    user: { id: user.id, email: user.email, name: user.name },
    profile 
  });
});
```

## Environment Configuration

Add to your `.env` file:

```env
# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_super_secret_jwt_key_here

# Cookie Domain for production (allows cookies across subdomains)
COOKIE_DOMAIN=.splitbuddy.ign3el.com

# Node Environment
NODE_ENV=production
```

### Cookie Domain Explanation

- **`.splitbuddy.ign3el.com`** (with leading dot):
  - Allows cookies to work across `www.splitbuddy.ign3el.com` and `api.splitbuddy.ign3el.com`
  - Set in production only
  
- **Local Development**:
  - No domain specified (defaults to current host)
  - Works with `localhost:3003`, `localhost:5173`, etc.

## Testing the Middleware

### 1. Test Login (Sets Cookie)

```bash
curl -X POST https://api.splitbuddy.ign3el.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt
```

### 2. Test Protected Route (Uses Cookie)

```bash
curl https://api.splitbuddy.ign3el.com/api/me \
  -b cookies.txt
```

### 3. Test with Authorization Header

```bash
TOKEN="your_jwt_token_here"
curl https://api.splitbuddy.ign3el.com/api/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Logout (Clears Cookie)

```bash
curl -X POST https://api.splitbuddy.ign3el.com/api/auth/logout \
  -b cookies.txt
```

## Current Protected Routes

All routes using `authMiddleware`:

- `GET /api/me` - Get current user
- `POST /api/auth/logout` - Logout and clear cookie
- `PUT /api/profiles` - Update user profile
- `POST /api/splits` - Create split record
- `GET /api/splits` - Get user's splits
- `GET /api/splits/:id` - Get specific split
- `DELETE /api/splits/:id` - Delete split

## Error Responses

### Missing Token (401)
```json
{
  "error": "Unauthorized: Missing authentication token"
}
```

### Invalid/Expired Token (401)
```json
{
  "error": "Unauthorized: Invalid or expired token"
}
```

### JWT Not Configured (500)
```json
{
  "error": "JWT not configured"
}
```

## Security Features

1. **HTTP-Only Cookies**: Prevents XSS attacks (JavaScript can't access token)
2. **Secure Flag**: HTTPS-only transmission in production
3. **SameSite=lax**: Protects against CSRF while allowing cross-subdomain
4. **Domain Scoping**: Limits cookie to `*.splitbuddy.ign3el.com`
5. **7-Day Expiration**: Automatic token expiry
6. **JWT Signature**: Cryptographically signed with `JWT_SECRET`

## Troubleshooting 401 Errors

If you're getting 401 Unauthorized:

1. **Check cookie name**: Must be `token` (not `splitbuddy_token`)
2. **Verify domain**: Set `COOKIE_DOMAIN=.splitbuddy.ign3el.com` in production
3. **Check HTTPS**: Cookies with `secure: true` only work over HTTPS
4. **SameSite setting**: Changed from `strict` to `lax` for subdomain support
5. **JWT_SECRET**: Ensure it's set in your `.env` file
6. **Cookie expiration**: Check if token hasn't expired (7 days default)

## Frontend Integration

```javascript
// API client automatically sends cookies
const response = await fetch('https://api.splitbuddy.ign3el.com/api/me', {
  credentials: 'include' // Important: Include cookies in request
});

// Or use Authorization header as fallback
const token = localStorage.getItem('token');
const response = await fetch('https://api.splitbuddy.ign3el.com/api/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Deployment Notes

When deploying to aaPanel:

1. Ensure `.env` is in project root (not in `/server`)
2. Set `NODE_ENV=production` via PM2/aaPanel
3. Configure `COOKIE_DOMAIN=.splitbuddy.ign3el.com`
4. Restart server: `pm2 restart splitbuddy-backend`
5. Test with browser DevTools → Application → Cookies
