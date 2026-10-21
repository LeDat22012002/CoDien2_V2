import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

export type OperationStatus = 'running' | 'stopped' | 'warning' | 'error';

export interface OperationStatusMeta {
  label: string;
  color: 'success' | 'default' | 'warning' | 'error';
  icon: ReactNode;
}

/** Màu trạng thái dùng thống nhất toàn app, luôn kèm icon và chữ (không chỉ dựa vào màu). */
export const OPERATION_STATUS_META: Record<OperationStatus, OperationStatusMeta> = {
  running: { label: 'Đang chạy', color: 'success', icon: <CheckCircleOutlined /> },
  stopped: { label: 'Dừng', color: 'default', icon: <MinusCircleOutlined /> },
  warning: { label: 'Cảnh báo', color: 'warning', icon: <ExclamationCircleOutlined /> },
  error: { label: 'Lỗi', color: 'error', icon: <CloseCircleOutlined /> },
};
