// Local development server entry point
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import app from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check root first (for aaPanel/production), then current folder (for local dev)
const rootEnv = path.resolve(__dirname, '..', '.env');
const localEnv = path.resolve(__dirname, '.env');
const finalPath = fs.existsSync(rootEnv) ? rootEnv : localEnv;

dotenv.config({ path: finalPath });
console.log(`[Config] Loading environment from: ${finalPath}`);

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
