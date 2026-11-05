import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '@/modules/auditLogs/api/auditLogsApi';
import type { AuditLogFilter } from '@/modules/auditLogs/types/auditLogs';

export const AUDIT_LOG_QUERY_KEYS = {
  list: (filter: AuditLogFilter) => ['audit-logs', 'list', filter] as const,
};

export const useAuditLogs = (filter: AuditLogFilter) =>
  useQuery({
    queryKey: AUDIT_LOG_QUERY_KEYS.list(filter),
    queryFn: () => getAuditLogs(filter),
    placeholderData: keepPreviousData,
  });
