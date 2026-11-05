import { Descriptions, Drawer, Grid, Tag } from 'antd';
import { EMPTY_TEXT, formatDateTimeSeconds, formatNumber } from '@/shared/utils/format';
import {
  AUDIT_LOG_TYPE_COLORS,
  AUDIT_LOG_TYPE_LABELS,
  getAuditLogActionLabel,
} from '@/modules/auditLogs/constants/auditLogOptions';
import { AuditLogStatusTag } from '@/modules/auditLogs/components/AuditLogStatusTag';
import type { AuditLog } from '@/modules/auditLogs/types/auditLogs';

interface AuditLogDetailDrawerProps {
  open: boolean;
  /** Giữ lại khi đóng để nội dung không chớp trong lúc Drawer trượt ra. */
  log: AuditLog | null;
  onClose: () => void;
}

/** JSON dữ liệu gửi lên in thụt lề cho dễ đọc; không phải JSON thì in nguyên. */
const formatJson = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const orEmpty = (value?: string | number | null) =>
  value === null || value === undefined || value === '' ? EMPTY_TEXT : value;

/** Chi tiết 1 dòng nhật ký: người làm, thao tác, kết quả, dữ liệu gửi lên, thiết bị truy cập. */
export const AuditLogDetailDrawer = ({ open, log, onClose }: AuditLogDetailDrawerProps) => {
  const screens = Grid.useBreakpoint();

  return (
    <Drawer open={open} onClose={onClose} size={screens.md ? 640 : '100%'} title="Chi tiết nhật ký">
      {log && (
        <div className="flex flex-col gap-4">
          <Descriptions
            bordered
            size="small"
            column={1}
            styles={{ label: { width: 150 } }}
            items={[
              { key: 'createdAt', label: 'Thời gian', children: formatDateTimeSeconds(log.createdAt) },
              {
                key: 'user',
                label: 'Người dùng',
                children: log.fullName ? `${log.fullName} (${log.empCode})` : orEmpty(log.empCode),
              },
              {
                key: 'type',
                label: 'Loại',
                children: <Tag color={AUDIT_LOG_TYPE_COLORS[log.type]}>{AUDIT_LOG_TYPE_LABELS[log.type]}</Tag>,
              },
              { key: 'action', label: 'Nội dung', children: getAuditLogActionLabel(log) },
              {
                key: 'path',
                label: log.type === 'PAGE_VIEW' ? 'Đường dẫn trang' : 'API',
                children: (
                  <span className="font-mono break-all">
                    {log.method && `${log.method} `}
                    {log.path}
                  </span>
                ),
              },
              ...(log.endpoint
                ? [{ key: 'endpoint', label: 'Xử lý tại', children: <span className="font-mono">{log.endpoint}</span> }]
                : []),
              ...(log.type === 'PAGE_VIEW'
                ? []
                : [
                    { key: 'status', label: 'Kết quả', children: <AuditLogStatusTag log={log} /> },
                    { key: 'message', label: 'Thông báo', children: orEmpty(log.message) },
                    {
                      key: 'duration',
                      label: 'Thời gian xử lý',
                      children: log.durationMs === null || log.durationMs === undefined
                        ? EMPTY_TEXT
                        : `${formatNumber(log.durationMs)} ms`,
                    },
                  ]),
              { key: 'ip', label: 'Địa chỉ IP', children: <span className="font-mono">{orEmpty(log.ipAddress)}</span> },
              {
                key: 'userAgent',
                label: 'Trình duyệt',
                children: <span className="break-all text-text-secondary">{orEmpty(log.userAgent)}</span>,
              },
            ]}
          />

          {log.requestBody && (
            <div>
              <div className="mb-2 font-semibold">Dữ liệu gửi lên</div>
              {/* Mật khẩu / token đã được Server che thành *** trước khi lưu */}
              <pre className="m-0 max-h-96 overflow-auto rounded-md border border-solid border-border bg-bg-layout p-3 font-mono text-sm whitespace-pre-wrap break-all">
                {formatJson(log.requestBody)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
