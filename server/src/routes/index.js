import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import studentRoutes from './student.routes.js';
import recruiterRoutes from './recruiter.routes.js';
import jobRoutes from './job.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/students', studentRoutes);
apiRouter.use('/recruiters', recruiterRoutes);
apiRouter.use('/jobs', jobRoutes);

export default apiRouter;
