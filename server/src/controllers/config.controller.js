import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getFeatureFlags } from '../config/features.js';

export const getFeatures = asyncHandler(async (req, res) => {
  const flags = getFeatureFlags();
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Feature flags retrieved successfully',
    data: flags
  });
});
