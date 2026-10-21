/** Response chung của Server: { success, message, data, errors }. */
export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  /** Lỗi theo field, key camelCase trùng tên field của request. */
  errors?: Record<string, string[]> | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

/** Tham số chung của mọi API danh sách phân trang (PagedRequest ở Server). */
export interface PagedRequest {
  pageIndex?: number;
  pageSize?: number;
  keyword?: string;
}
