import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Registration successful',
    data: result
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Login successful',
    data: result
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const membershipContext = await authService.getUserMembershipContext(req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Current user profile retrieved',
    data: {
      user: req.user.toJSON(),
      profile: req.profile ? req.profile.toJSON() : null,
      organization: membershipContext.organization,
      memberships: membershipContext.memberships
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged out successfully',
    data: {}
  });
});

