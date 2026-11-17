import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env.js';

// Initialize Cloudinary if credentials are provided
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });
}

/**
 * Cloudinary Storage Implementation
 */
export class CloudinaryStorage {
  async upload(fileBuffer, { filename, mimetype }) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'hiretrack/resumes',
          resource_type: 'raw',
          public_id: `resume_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
        },
        (error, result) => {
          if (error) {
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          resolve({
            url: result.secure_url || result.url,
            publicId: result.public_id,
            fileName: filename,
            mimeType: mimetype,
            size: result.bytes || fileBuffer.length,
            uploadedAt: new Date()
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  async delete(publicId) {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch (err) {
      console.warn(`[Storage] Failed to delete Cloudinary asset ${publicId}:`, err.message);
    }
  }
}

/**
 * Local Disk Storage Implementation (for local development & offline testing)
 */
export class LocalDevStorage {
  constructor(uploadDir = path.resolve(process.cwd(), 'uploads/resumes')) {
    this.uploadDir = uploadDir;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(fileBuffer, { filename, mimetype }) {
    const ext = path.extname(filename);
    const safeBaseName = path
      .basename(filename, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    const uniqueId = `resume_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const storedFileName = `${uniqueId}_${safeBaseName}${ext}`;
    const filePath = path.join(this.uploadDir, storedFileName);

    await fs.promises.writeFile(filePath, fileBuffer);

    return {
      url: `/uploads/resumes/${storedFileName}`,
      publicId: uniqueId,
      fileName: filename,
      mimeType: mimetype,
      size: fileBuffer.length,
      uploadedAt: new Date()
    };
  }

  async delete(publicId) {
    if (!publicId) return;
    try {
      const files = await fs.promises.readdir(this.uploadDir);
      const target = files.find((f) => f.startsWith(publicId));
      if (target) {
        await fs.promises.unlink(path.join(this.uploadDir, target));
      }
    } catch (err) {
      console.warn(`[Storage] Failed to delete local file ${publicId}:`, err.message);
    }
  }
}

// Storage instance singleton / resolver
let currentStorageInstance = null;

export const getStorageAdapter = () => {
  if (currentStorageInstance) {
    return currentStorageInstance;
  }

  // Determine provider: use Cloudinary if configured and not explicitly set to local
  const provider = (process.env.STORAGE_PROVIDER || '').toLowerCase();
  const hasCloudinaryConfig = Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET &&
      env.CLOUDINARY_CLOUD_NAME !== 'demo'
  );

  if (provider === 'cloudinary' || (hasCloudinaryConfig && provider !== 'local')) {
    currentStorageInstance = new CloudinaryStorage();
  } else {
    currentStorageInstance = new LocalDevStorage();
  }

  return currentStorageInstance;
};

export const setStorageAdapter = (adapter) => {
  currentStorageInstance = adapter;
};

