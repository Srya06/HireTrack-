import { OrganizationMembership, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { scopeOrg, findByIdInOrg, findOneInOrg, paginateInOrg } from '../utils/orgScope.js';
import { recordAuditEvent } from './audit.service.js';
import {
  STAFF_MEMBERSHIP_ROLES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES
} from '../utils/constants.js';

/**
 * Lists staff memberships strictly within the caller's organization.
 */
export const listStaffMemberships = async (
  organizationId,
  { page = 1, limit = 20, role = null, status = null, q = '' } = {}
) => {
  const filter = {
    role: role && STAFF_MEMBERSHIP_ROLES.includes(role) ? role : { $in: STAFF_MEMBERSHIP_ROLES }
  };

  if (status && Object.values(MEMBERSHIP_STATUSES).includes(status)) {
    filter.status = status;
  }

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const matchingUsers = await User.find(
      scopeOrg(organizationId, { $or: [{ name: regex }, { email: regex }] }),
      { _id: 1 }
    ).lean();
    filter.userId = { $in: matchingUsers.map((u) => u._id) };
  }

  const { items, pagination } = await paginateInOrg(OrganizationMembership, filter, organizationId, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: [
      { path: 'userId', select: 'name email role accountStatus organizationId' },
      { path: 'grantedBy', select: 'name email' },
      { path: 'revokedBy', select: 'name email' }
    ]
  });

  return {
    staff: items.map((m) => m.toJSON()),
    pagination
  };
};

/**
 * Grants a staff OrganizationMembership role to an existing user inside the caller's organization.
 * Cross-organization target users return 404 (never leaking existence across org boundaries).
 */
export const grantStaffRole = async (organizationId, actorUser, { userId, email, role }) => {
  if (!STAFF_MEMBERSHIP_ROLES.includes(role)) {
    throw ApiError.badRequest(`Invalid staff role. Allowed: ${STAFF_MEMBERSHIP_ROLES.join(', ')}`);
  }

  // Strictly look up target user inside caller's organization
  const userFilter = userId ? { _id: userId } : { email: String(email).toLowerCase().trim() };
  const targetUser = await findOneInOrg(User, userFilter, organizationId);

  if (!targetUser) {
    throw ApiError.notFound('User not found in your organization');
  }

  // Check for existing membership record for (organizationId, userId, role)
  let membership = await findOneInOrg(
    OrganizationMembership,
    { userId: targetUser._id, role },
    organizationId
  );

  let previousStatus = null;
  if (membership) {
    if (membership.status === MEMBERSHIP_STATUSES.ACTIVE) {
      throw ApiError.conflict(`User already holds the active ${role} role in this organization`);
    }
    previousStatus = membership.status;
    membership.status = MEMBERSHIP_STATUSES.ACTIVE;
    membership.grantedBy = actorUser._id;
    membership.grantedAt = new Date();
    membership.revokedBy = null;
    membership.revokedAt = null;
    await membership.save();
  } else {
    membership = await OrganizationMembership.create({
      organizationId,
      userId: targetUser._id,
      role,
      status: MEMBERSHIP_STATUSES.ACTIVE,
      grantedBy: actorUser._id,
      grantedAt: new Date()
    });
  }

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'STAFF_ROLE_GRANTED',
    entityType: 'OrganizationMembership',
    entityId: membership._id,
    metadata: {
      targetUserId: targetUser._id.toString(),
      role,
      previousStatus: previousStatus || 'none',
      newStatus: MEMBERSHIP_STATUSES.ACTIVE
    },
    allowedMetadataKeys: ['targetUserId', 'role', 'previousStatus', 'newStatus']
  });

  await membership.populate([
    { path: 'userId', select: 'name email role accountStatus organizationId' },
    { path: 'grantedBy', select: 'name email' }
  ]);

  return membership.toJSON();
};

/**
 * Updates (revokes, suspends, or reactivates) a staff membership strictly within the caller's org.
 * Cross-organization access returns 404.
 */
export const updateStaffMembership = async (organizationId, actorUser, membershipId, { status }) => {
  if (!Object.values(MEMBERSHIP_STATUSES).includes(status)) {
    throw ApiError.badRequest(
      `Status must be one of: ${Object.values(MEMBERSHIP_STATUSES).join(', ')}`
    );
  }

  const membership = await findByIdInOrg(OrganizationMembership, membershipId, organizationId);
  if (!membership || !STAFF_MEMBERSHIP_ROLES.includes(membership.role)) {
    throw ApiError.notFound('Staff membership not found');
  }

  // Prevent an ORG_ADMIN from revoking or suspending their own ORG_ADMIN membership
  if (
    membership.userId.toString() === actorUser._id.toString() &&
    membership.role === MEMBERSHIP_ROLES.ORG_ADMIN &&
    status !== MEMBERSHIP_STATUSES.ACTIVE
  ) {
    throw ApiError.badRequest('You cannot revoke or suspend your own Organization Admin role');
  }

  const previousStatus = membership.status;
  membership.status = status;

  if (status === MEMBERSHIP_STATUSES.ACTIVE) {
    membership.grantedBy = actorUser._id;
    membership.grantedAt = new Date();
    membership.revokedBy = null;
    membership.revokedAt = null;
  } else {
    membership.revokedBy = actorUser._id;
    membership.revokedAt = new Date();
  }

  await membership.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'STAFF_ROLE_UPDATED',
    entityType: 'OrganizationMembership',
    entityId: membership._id,
    metadata: {
      targetUserId: membership.userId.toString(),
      role: membership.role,
      previousStatus,
      newStatus: status
    },
    allowedMetadataKeys: ['targetUserId', 'role', 'previousStatus', 'newStatus']
  });

  await membership.populate([
    { path: 'userId', select: 'name email role accountStatus organizationId' },
    { path: 'grantedBy', select: 'name email' },
    { path: 'revokedBy', select: 'name email' }
  ]);

  return membership.toJSON();
};
