import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import type { AuditLog } from '@/modules/auditLogs/types/auditLogs';

interface AuditLogStatusTagProps {
  log: AuditLog;
}

/** Thành công / thất bại kèm icon và mã HTTP (không chỉ dựa vào màu). Lượt mở trang không có kết quả. */
export const AuditLogStatusTag = ({ log }: AuditLogStatusTagProps) => {
  if (log.type === 'PAGE_VIEW') return null;

  return log.isSuccess ? (
    <Tag color="success" icon={<CheckCircleOutlined />}>
      Thành công{log.statusCode ? ` · ${log.statusCode}` : ''}
    </Tag>
  ) : (
    <Tag color="error" icon={<CloseCircleOutlined />}>
      Thất bại{log.statusCode ? ` · ${log.statusCode}` : ''}
    </Tag>
  );
};
