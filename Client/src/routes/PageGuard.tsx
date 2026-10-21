import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import ForbiddenPage from '@/shared/pages/ForbiddenPage';
import { useCanAccessRoute } from '@/stores/authStore';

interface PageGuardProps {
  /** Path của trang trong bảng Page (vd "/employees"), phải khớp với route khai báo ở router. */
  pagePath: string;
  /** Bỏ trống khi dùng làm route cha: các route con render qua Outlet. */
  children?: ReactNode;
}

/** Chặn trang theo danh sách route user được vào (GET /api/auth/me → routes). */
export const PageGuard = ({ pagePath, children }: PageGuardProps) => {
  const canAccess = useCanAccessRoute(pagePath);
  if (!canAccess) return <ForbiddenPage />;
  return children ?? <Outlet />;
};
