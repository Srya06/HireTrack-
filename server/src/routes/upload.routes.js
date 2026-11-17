import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { RESUMES_UPLOAD_DIR } from '../utils/demoPdfGenerator.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

const ALLOWED_EXTENSIONS = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

router.get('/resumes/:filename', (req, res, next) => {
  const safeName = path.basename(req.params.filename || '');
  const ext = path.extname(safeName).toLowerCase();

  if (!safeName || !ALLOWED_EXTENSIONS[ext]) {
    return next(ApiError.badRequest('Invalid or unsupported document filename'));
  }

  const resolvedPath = path.resolve(RESUMES_UPLOAD_DIR, safeName);

  // Strict directory containment check against path traversal
  if (!resolvedPath.startsWith(path.resolve(RESUMES_UPLOAD_DIR))) {
    return next(ApiError.forbidden('Access denied'));
  }

  if (!fs.existsSync(resolvedPath)) {
    return next(ApiError.notFound('Resume document not found'));
  }

  res.setHeader('Content-Type', ALLOWED_EXTENSIONS[ext]);
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  return res.sendFile(resolvedPath);
});

export default router;

