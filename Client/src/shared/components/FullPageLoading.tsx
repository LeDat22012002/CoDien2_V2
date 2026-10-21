import { Spin } from 'antd';

interface FullPageLoadingProps {
  tip?: string;
}

export const FullPageLoading = ({ tip = 'Đang tải...' }: FullPageLoadingProps) => (
  <div className="flex min-h-dvh items-center justify-center">
    <Spin size="large" description={tip} />
  </div>
);
