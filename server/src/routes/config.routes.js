import { Router } from 'express';
import * as configController from '../controllers/config.controller.js';

const router = Router();

// Public feature flag discovery endpoint (allowlisted booleans only, no secrets)
router.get('/features', configController.getFeatures);

export default router;
