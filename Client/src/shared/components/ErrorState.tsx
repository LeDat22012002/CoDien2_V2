import { ReloadOutlined } from '@ant-design/icons';
import { Button, Result } from 'antd';
import { getErrorMessage } from '@/shared/api/axiosClient';

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

/** Trạng thái lỗi khi tải dữ liệu, dùng chung cho mọi màn hình. */
export const ErrorState = ({ error, title = 'Không tải được dữ liệu', onRetry }: ErrorStateProps) => (
  <Result
    status="error"
    title={title}
    subTitle={getErrorMessage(error)}
    extra={
      onRetry && (
        <Button icon={<ReloadOutlined />} onClick={onRetry}>
          Thử lại
        </Button>
      )
    }
  />
);
