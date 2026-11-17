import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { mongoSanitizeMiddleware } from './middleware/mongoSanitize.middleware.js';
import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

// Disable X-Powered-By header to avoid revealing framework
app.disable('x-powered-by');

// Security headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Whitelisted CORS origins
const allowedOrigins = (env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin backend-to-backend)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Blocked by CORS policy: Origin '${origin}' is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// JSON body parser with size limit to prevent payload bombs
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL Injection Sanitization - recursively strips keys containing '$' or '.'
app.use(mongoSanitizeMiddleware);

// Development request logging
if (env.isDevelopment && !env.isTest) {
  app.use(morgan('dev'));
}

// Global API rate limiting
app.use('/api/v1', apiRateLimiter);

// Mount versioned API routes
app.use('/api/v1', apiRouter);

// Catch 404 for unmatched routes
app.use(notFoundMiddleware);

// Centralized error handling middleware
app.use(errorMiddleware);

export default app;

