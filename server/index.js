// Local development server entry point
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '..', '.env')
  : path.join(__dirname, '.env');

dotenv.config({ path: envPath });

const port = process.env.PORT || 3003;

try {
  console.log(`[Startup] Starting SplitBuddy server on port ${port}...`);
  
  // Bind to 0.0.0.0 to allow Docker container to receive traffic from the network bridge
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`✓ SplitBuddy server listening on port ${port}`);
  });

  server.on('error', (err) => {
    console.error(`[Server Error] ${err.message}`);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(`[Unhandled Rejection]`, reason);
  });

  process.on('uncaughtException', (err) => {
    console.error(`[Uncaught Exception] ${err.message}`);
    process.exit(1);
  });
} catch (err) {
  console.error(`[Startup Error] ${err.message}`);
  console.error(err.stack);
  process.exit(1);
}
