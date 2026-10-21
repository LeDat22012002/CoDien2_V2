import { Typography } from 'antd';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Nút hành động bên phải (Thêm mới, Xuất Excel…). Xuống dòng dưới tiêu đề trên điện thoại. */
  extra?: ReactNode;
}

export const PageHeader = ({ title, description, extra }: PageHeaderProps) => (
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <Typography.Title level={4} className="mb-0">
        {title}
      </Typography.Title>
      {description && <Typography.Text type="secondary">{description}</Typography.Text>}
    </div>
    {extra && <div className="flex flex-wrap gap-2">{extra}</div>}
  </div>
);
