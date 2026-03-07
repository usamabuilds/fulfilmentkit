export type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function toListResponse<T>(args: {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}): ListResponse<T> {
  return {
    items: args.items,
    total: args.total,
    page: args.page,
    pageSize: args.pageSize,
  };
}
