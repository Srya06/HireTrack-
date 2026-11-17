import multer from 'multer';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

// Use memory storage so file buffer is directly available for the storage adapter
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);
  const isMimeValid = ALLOWED_MIME_TYPES.includes(mime);

  if (isExtValid && isMimeValid) {
    return cb(null, true);
  }

  return cb(
    ApiError.badRequest(
      'Invalid file format. Only PDF, DOC, and DOCX files are allowed for resumes.',
      [{ field: 'resume', message: `Disallowed file type (${ext || mime}). Must be .pdf, .doc, or .docx` }]
    ),
    false
  );
};

const maxSizeBytes = (env.MAX_RESUME_SIZE_MB || 5) * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
    files: 1
  },
  fileFilter
}).single('resume');

/**
 * Middleware handling resume multipart upload with standard API errors
 */
export const uploadResumeMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            ApiError.badRequest(`File size exceeds allowed limit of ${env.MAX_RESUME_SIZE_MB}MB`, [
              { field: 'resume', message: `Resume exceeds the ${env.MAX_RESUME_SIZE_MB}MB maximum limit` }
            ])
          );
        }
        return next(ApiError.badRequest(err.message, [{ field: 'resume', message: err.message }]));
      }
      return next(err);
    }

    if (!req.file) {
      return next(
        ApiError.badRequest('Resume file is required', [
          { field: 'resume', message: 'Please upload a resume file using multipart form-data under key "resume"' }
        ])
      );
    }

    return next();
  });
};

