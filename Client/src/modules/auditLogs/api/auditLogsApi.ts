import { httpGet, httpPost } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type { AuditLog, AuditLogFilter, CreatePageViewRequest } from '@/modules/auditLogs/types/auditLogs';

/** Nhật ký mới nhất lên đầu (quyền audit-logs.view). */
export const getAuditLogs = (filter: AuditLogFilter) => httpGet<PagedResult<AuditLog>>('/audit-logs', filter);

/** Ghi lượt mở trang của người đang đăng nhập. */
export const createPageView = (request: CreatePageViewRequest) => httpPost<null>('/audit-logs/page-views', request);
