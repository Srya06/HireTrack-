import { verifyToken } from '../utils/token.js';
import { User, StudentProfile, RecruiterProfile } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { USER_STATUSES, ROLES } from '../utils/constants.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(ApiError.unauthorized('Authentication token missing. Please sign in.'));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Authentication token has expired. Please sign in again.'));
      }
      return next(ApiError.unauthorized('Invalid authentication token.'));
    }

    // Reload actor directly from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(ApiError.unauthorized('The user belonging to this token no longer exists.'));
    }

    // Check account status
    if (user.accountStatus === USER_STATUSES.SUSPENDED) {
      return next(ApiError.forbidden('Account is suspended. Please contact the placement cell.'));
    }
    if (user.accountStatus === USER_STATUSES.REJECTED) {
      return next(ApiError.forbidden('Account registration was rejected.'));
    }

    // Attach profile if student or recruiter
    let profile = null;
    if (user.role === ROLES.STUDENT) {
      profile = await StudentProfile.findOne({ userId: user._id });
    } else if (user.role === ROLES.RECRUITER) {
      profile = await RecruiterProfile.findOne({ userId: user._id });
    }

    req.user = user;
    req.profile = profile;
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    return next();
  };
};

