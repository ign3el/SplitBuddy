// Catch-all serverless function to handle all /api/* routes via Express
import app from './app.js';

export default function handler(req, res) {
  return app(req, res);
}
