import { Organization, OrganizationMembership } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { MEMBERSHIP_STATUSES, ORGANIZATION_STATUSES } from '../utils/constants.js';

/**
 * Resolves organization context strictly from the authenticated user's active memberships.
 * NEVER reads organizationId from req.body, req.query, req.params, or client headers.
 */
export const attachOrganization = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const activeMemberships = await OrganizationMembership.find({
      userId: req.user._id,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });

    if (!activeMemberships.length) {
      return next(
        ApiError.forbidden('Access denied: No active organization membership found for this account')
      );
    }

    // Prefer user's primary organizationId if it matches an active membership; otherwise first active membership
    let targetOrgId = activeMemberships[0].organizationId;
    if (req.user.organizationId) {
      const hasPrimary = activeMemberships.some(
        (m) => m.organizationId.toString() === req.user.organizationId.toString()
      );
      if (hasPrimary) {
        targetOrgId = req.user.organizationId;
      }
    }

    const org = await Organization.findById(targetOrgId);
    if (!org || org.status !== ORGANIZATION_STATUSES.ACTIVE) {
      return next(ApiError.forbidden('Access denied: Organization is inactive or unavailable'));
    }

    const orgMemberships = activeMemberships.filter(
      (m) => m.organizationId.toString() === org._id.toString()
    );

    req.organizationId = org._id;
    req.organization = org;
    req.memberships = orgMemberships;
    req.membershipRoles = orgMemberships.map((m) => m.role);

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Enforces that the authenticated user holds at least one of the allowed active
 * OrganizationMembership roles in req.organizationId.
 *
 * @param  {...string} allowedRoles
 */
export const authorizeMemberships = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!req.organizationId || !Array.isArray(req.membershipRoles)) {
      return next(ApiError.forbidden('Organization membership context is required'));
    }

    const hasPermittedRole = req.membershipRoles.some((role) => allowedRoles.includes(role));
    if (!hasPermittedRole) {
      return next(
        ApiError.forbidden(
          `Access forbidden: Requires one of [${allowedRoles.join(', ')}] membership role(s)`
        )
      );
    }

    return next();
  };
};
