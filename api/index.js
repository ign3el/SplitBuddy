// Vercel serverless function handler
import app from './app.js';

// Export a standard Node handler that delegates to Express
export default function handler(req, res) {
	return app(req, res);
}
