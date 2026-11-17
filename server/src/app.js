import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

// Security headers with Helmet
app.use(helmet());

// Restrict CORS to CLIENT_URL
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// JSON body parser with size limit to prevent payload bombs
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Development request logging
if (env.isDevelopment && !env.isTest) {
  app.use(morgan('dev'));
}

// Mount versioned API routes
app.use('/api/v1', apiRouter);

// Catch 404 for unmatched routes
app.use(notFoundMiddleware);

// Centralized error handling middleware
app.use(errorMiddleware);

export default app;

