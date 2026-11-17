import { Router } from 'express';
import { getDBStatus } from '../config/db.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', (req, res) => {
  const dbStatus = getDBStatus();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'HireTrack API is healthy',
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus
    }
  });
});

export default router;

