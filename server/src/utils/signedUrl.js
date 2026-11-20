import crypto from 'crypto';
import { env } from '../config/env.js';

const SIGN_SECRET = env.JWT_SECRET || 'hiretrack_signed_url_default_secret_key_32';

/**
 * Generates an HMAC-SHA256 signed token and expiry timestamp for a file asset.
 *
 * @param {string} fileAssetId
 * @param {number} [expiresInSeconds=900] - Defaults to 15 minutes
 * @returns {{ token: string, expires: number }}
 */
export const generateSignedFileToken = (fileAssetId, expiresInSeconds = 900) => {
  const expires = Date.now() + expiresInSeconds * 1000;
  const hmac = crypto.createHmac('sha256', SIGN_SECRET);
  hmac.update(`${fileAssetId}:${expires}`);
  const token = hmac.digest('hex');
  return { token, expires };
};

/**
 * Verifies an HMAC-SHA256 signed token and checks timestamp validity.
 *
 * @param {string} fileAssetId
 * @param {string} token
 * @param {number|string} expires
 * @returns {boolean}
 */
export const verifySignedFileToken = (fileAssetId, token, expires) => {
  if (!fileAssetId || !token || !expires) {
    return false;
  }

  const expNum = Number(expires);
  if (isNaN(expNum) || Date.now() > expNum) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', SIGN_SECRET);
  hmac.update(`${fileAssetId}:${expNum}`);
  const expectedToken = hmac.digest('hex');

  try {
    const tokenBuffer = Buffer.from(token, 'hex');
    const expectedBuffer = Buffer.from(expectedToken, 'hex');
    if (tokenBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

export const verifySignedToken = verifySignedFileToken;


/**
 * Convenience helper to return the relative signed download URL for an asset.
 *
 * @param {string} fileAssetId
 * @param {number} [expiresInSeconds=900]
 * @returns {string}
 */
export const getSignedDownloadUrl = (fileAssetId, expiresInSeconds = 900) => {
  const { token, expires } = generateSignedFileToken(fileAssetId, expiresInSeconds);
  return `/api/v1/files/${fileAssetId}/download?token=${token}&expires=${expires}`;
};
