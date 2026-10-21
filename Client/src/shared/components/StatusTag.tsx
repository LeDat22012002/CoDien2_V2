import { Tag } from 'antd';
import { OPERATION_STATUS_META, type OperationStatus } from '@/shared/constants/operationStatus';

interface StatusTagProps {
  status: OperationStatus;
  /** Ghi đè chữ hiển thị khi nghiệp vụ dùng tên khác (vd "Quá hạn"), vẫn giữ màu + icon. */
  label?: string;
}

export const StatusTag = ({ status, label }: StatusTagProps) => {
  const meta = OPERATION_STATUS_META[status];
  return (
    <Tag color={meta.color} icon={meta.icon}>
      {label ?? meta.label}
    </Tag>
  );
};
