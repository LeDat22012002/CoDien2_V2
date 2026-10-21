import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoading } from '@/shared/components/FullPageLoading';
import { buildLoginPath } from '@/shared/utils/redirect';
import { useSessionBootstrap } from '@/modules/identity/hooks/useSessionBootstrap';

/** Bắt buộc đăng nhập; chưa đăng nhập thì chuyển về /login kèm đường dẫn để quay lại sau. */
export const PrivateRoute = () => {
  const status = useSessionBootstrap();
  const location = useLocation();

  if (status === 'unknown') return <FullPageLoading tip="Đang kiểm tra phiên đăng nhập..." />;
  if (status === 'anonymous') {
    return <Navigate to={buildLoginPath(`${location.pathname}${location.search}`)} replace />;
  }
  return <Outlet />;
};
