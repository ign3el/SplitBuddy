// Catch-all serverless function to handle all /api/* routes via Express
// Lazy-load the Express app to catch import errors and cache it per runtime
let cachedApp = globalThis.__sbExpressApp || null;

export default async function handler(req, res) {
  try {
    if (!cachedApp) {
      const mod = await import('./app.js');
      cachedApp = mod.default;
      globalThis.__sbExpressApp = cachedApp;
    }
    return cachedApp(req, res);
  } catch (err) {
    console.error('API handler error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, message: err?.message || 'Handler error', stack: err?.stack }));
  }
}
