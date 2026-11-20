import { Router } from 'express';
import healthRoutes from './health.routes.js';
import configRoutes from './config.routes.js';
import authRoutes from './auth.routes.js';
import organizationRoutes from './organization.routes.js';
import staffRoutes from './staff.routes.js';
import adminRoutes from './admin.routes.js';
import studentRoutes from './student.routes.js';
import recruiterRoutes from './recruiter.routes.js';
import jobRoutes from './job.routes.js';
import applicationRoutes from './application.routes.js';
import interviewRoutes from './interview.routes.js';
import notificationRoutes from './notification.routes.js';
import uploadRoutes from './upload.routes.js';
import fileRoutes from './file.routes.js';
import opportunityRoutes from './opportunity.routes.js';
import opportunityAdminRoutes from './opportunityAdmin.routes.js';
import * as eligibilityController from '../controllers/eligibility.controller.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';
import { protect } from '../middleware/auth.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/config', configRoutes);
apiRouter.get('/me', protect, authController.getMe);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/organizations', organizationRoutes);
apiRouter.use('/admin/staff', staffRoutes);
apiRouter.post(
  '/admin/eligibility/:evaluationId/override',
  protect,
  attachOrganization,
  authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN, MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR),
  validate(validateObjectId('evaluationId')),
  eligibilityController.overrideEligibilityAdmin
);
apiRouter.use('/admin/opportunities', opportunityAdminRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/opportunities', opportunityRoutes);
apiRouter.use('/students', studentRoutes);
apiRouter.use('/recruiters', recruiterRoutes);
apiRouter.use('/jobs', jobRoutes);
apiRouter.use('/applications', applicationRoutes);
apiRouter.use('/interviews', interviewRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/files', fileRoutes);

export default apiRouter;
