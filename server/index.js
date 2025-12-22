// Local development server entry point
import 'dotenv/config';
import app from './app.js';

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
