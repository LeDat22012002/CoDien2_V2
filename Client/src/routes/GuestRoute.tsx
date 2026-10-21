import { Navigate, Outlet, useSearchParams } from 'react-router';
import { FullPageLoading } from '@/shared/components/FullPageLoading';
import { getSafeRedirect, REDIRECT_PARAM } from '@/shared/utils/redirect';
import { useSessionBootstrap } from '@/modules/identity/hooks/useSessionBootstrap';

/** Trang chỉ dành cho người chưa đăng nhập (Đăng nhập); đã có phiên thì chuyển vào app. */
export const GuestRoute = () => {
  const status = useSessionBootstrap();
  const [searchParams] = useSearchParams();

  if (status === 'unknown') return <FullPageLoading />;
  if (status === 'authenticated') {
    return <Navigate to={getSafeRedirect(searchParams.get(REDIRECT_PARAM))} replace />;
  }
  return <Outlet />;
};
