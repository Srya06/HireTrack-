import { Router } from 'express';
import * as fileController from '../controllers/file.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';

const router = Router();

// GET /api/v1/files/:id/signed-url (authenticated - owner or staff only)
router.get(
  '/:id/signed-url',
  protect,
  validate(validateObjectId('id')),
  fileController.getSignedUrl
);

// GET /api/v1/files/:id/download (short-lived HMAC token verified)
router.get(
  '/:id/download',
  validate(validateObjectId('id')),
  fileController.downloadFile
);

export default router;
