export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ApiListData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiListResponse<T> {
  success: true
  data: ApiListData<T>
}

export interface ApiError {
  success: false
  message: string
  statusCode: number
}

export type ApiResult<T> = ApiResponse<T> | ApiError
