export type PaginationParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export function parsePagination(query: any, defaults?: { page?: number; pageSize?: number }) {
  const rawPage = query?.page;
  const rawPageSize = query?.pageSize;

  const pageDefault = defaults?.page ?? 1;
  const pageSizeDefault = defaults?.pageSize ?? 25;

  const page = clampInt(toInt(rawPage, pageDefault), 1, 1_000_000);
  const pageSize = clampInt(toInt(rawPageSize, pageSizeDefault), 1, 200);

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const result: PaginationParams = { page, pageSize, skip, take };
  return result;
}

function toInt(value: any, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clampInt(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
