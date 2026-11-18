import { ApiError } from './ApiError.js';

/**
 * Builds a MongoDB query filter that ALWAYS enforces organizationId scoping.
 * Overrides any accidental organizationId in caller-supplied filter objects.
 *
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 * @param {object} [filter={}]
 * @returns {object}
 */
export const scopeOrg = (organizationId, filter = {}) => {
  if (!organizationId) {
    throw ApiError.forbidden('Organization context is required for this operation');
  }
  return {
    ...filter,
    organizationId
  };
};

/**
 * Finds a single document by _id strictly within the given organization.
 * Returns null if missing OR if owned by another organization (callers map null -> 404).
 *
 * @param {import('mongoose').Model} Model
 * @param {string|import('mongoose').Types.ObjectId} id
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 * @param {{ populate?: any, select?: string }} [options={}]
 */
export const findByIdInOrg = async (Model, id, organizationId, options = {}) => {
  let query = Model.findOne(scopeOrg(organizationId, { _id: id }));
  if (options.select) query = query.select(options.select);
  if (options.populate) query = query.populate(options.populate);
  return query;
};

/**
 * Finds one document matching filter strictly within the given organization.
 */
export const findOneInOrg = async (Model, filter, organizationId, options = {}) => {
  let query = Model.findOne(scopeOrg(organizationId, filter));
  if (options.select) query = query.select(options.select);
  if (options.populate) query = query.populate(options.populate);
  return query;
};

/**
 * Paginated query helper strictly scoped to organizationId.
 */
export const paginateInOrg = async (
  Model,
  filter,
  organizationId,
  { page = 1, limit = 20, sort = { createdAt: -1 }, populate = null, select = null } = {}
) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const scopedFilter = scopeOrg(organizationId, filter);

  let findQuery = Model.find(scopedFilter).sort(sort).skip(skip).limit(limitNum);
  if (select) findQuery = findQuery.select(select);
  if (populate) findQuery = findQuery.populate(populate);

  const [total, items] = await Promise.all([Model.countDocuments(scopedFilter), findQuery]);
  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};
