import type { PaginationMeta } from './apiResponse';

export interface PaginationQuery {
  page?: unknown;
  limit?: unknown;
  search?: unknown;
}

export interface ParsedPagination {
  page: number;
  limit: number;
  search?: string;
  skip: number;
  take: number;
}

export function parsePagination(query: PaginationQuery, defaults?: { page?: number; limit?: number }): ParsedPagination {
  const page = Math.max(1, Number(query.page) || defaults?.page || 1);
  const rawLimit = Number(query.limit) || defaults?.limit || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const search =
    typeof query.search === 'string' && query.search.trim().length > 0
      ? query.search.trim()
      : undefined;

  return {
    page,
    limit,
    search,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
