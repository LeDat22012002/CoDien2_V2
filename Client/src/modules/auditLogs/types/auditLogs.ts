import type { PagedRequest } from '@/shared/types/api';

export type AuditLogType = 'LOGIN' | 'PAGE_VIEW' | 'ACTION';

export interface AuditLog {
  id: number;
  type: AuditLogType;
  userId?: number | null;
  empCode?: string | null;
  fullName?: string | null;
  /** POST | PUT | PATCH | DELETE; lượt mở trang để null. */
  method?: string | null;
  /** Thao tác: đường dẫn API; mở trang: đường dẫn trang ở Client. */
  path: string;
  pageTitle?: string | null;
  /** Controller.Action ở Server, vd "Incidents.UpdateAnalysis". */
  endpoint?: string | null;
  statusCode?: number | null;
  isSuccess: boolean;
  message?: string | null;
  /** JSON dữ liệu gửi lên, đã che mật khẩu / token. */
  requestBody?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  durationMs?: number | null;
  createdAt: string;
}

export interface AuditLogFilter extends PagedRequest {
  type?: AuditLogType;
  isSuccess?: boolean;
  method?: string;
  /** YYYY-MM-DD */
  fromDate?: string;
  toDate?: string;
}

export interface CreatePageViewRequest {
  path: string;
  title?: string;
}
