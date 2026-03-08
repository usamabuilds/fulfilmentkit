export function apiResponse<T>(data: T) {
  return { success: true as const, data };
}
