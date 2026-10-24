import { PAGE_SIZE } from '../../shared/limits.js';

const MAX_PAGE = 500;

const readInt = (value, fallback) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
};

export const readPaging = (query = {}, { defaultLimit = PAGE_SIZE.default, maxLimit = PAGE_SIZE.max } = {}) => {
  const page = Math.min(MAX_PAGE, Math.max(1, readInt(query.page, 1)));
  const limit = Math.min(maxLimit, Math.max(1, readInt(query.limit, defaultLimit)));
  return { page, limit, offset: (page - 1) * limit };
};

export const pageOf = (items, total, { page, limit, offset }) => ({
  items,
  page,
  limit,
  total,
  hasMore: offset + items.length < total,
});
