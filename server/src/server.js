import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const startServer = async () => {
  try {
    // Await database connection before listening for traffic
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log(`[HireTrack Server] Running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[HireTrack Server] API Base URL: http://localhost:${env.PORT}/api/v1`);
      console.log(`[HireTrack Server] Health check: http://localhost:${env.PORT}/api/v1/health`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[HireTrack Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('[HireTrack Server] HTTP server closed.');
        await disconnectDB();
        console.log('[HireTrack Server] Database disconnected. Exit complete.');
        process.exit(0);
      });

      // Force shutdown after 10s if hung
      setTimeout(() => {
        console.error('[HireTrack Server] Forcing shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      console.error('[HireTrack Server] Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('[HireTrack Server] Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('[HireTrack Server] Startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
