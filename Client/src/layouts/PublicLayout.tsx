import { Outlet, useMatches } from 'react-router';
import { useIsScrolledPast } from '@/shared/hooks/useIsScrolledPast';
import { useSessionBootstrap } from '@/modules/identity/hooks/useSessionBootstrap';
import { PublicHeader } from '@/layouts/components/PublicHeader';

/** Cuộn quá header thường (64px) một chút thì hiện header cố định, như hệ thống cũ. */
const FIXED_HEADER_SCROLL_THRESHOLD = 80;

/** Khai báo trên route (`handle`) để trang chiếm toàn bộ phần dưới header, không lề, không giới hạn bề rộng. */
export interface PublicRouteHandle {
  isFullScreen?: boolean;
}

/**
 * Layout trang công khai (kiểu landing page): header ngang, nội dung rộng tối đa 1400px, không footer
 * (trang có handle.isFullScreen thì chiếm toàn màn hình, vd Sơ đồ tổ chức).
 * Không chặn khi chưa đăng nhập; khôi phục phiên nền để header hiện đúng nút Đăng nhập / tài khoản.
 */
const PublicLayout = () => {
  useSessionBootstrap();
  const isFixedHeaderVisible = useIsScrolledPast(FIXED_HEADER_SCROLL_THRESHOLD);
  const isFullScreen = useMatches().some((match) => (match.handle as PublicRouteHandle | undefined)?.isFullScreen);

  return (
    <div className="flex min-h-dvh flex-col">
      {isFixedHeaderVisible && <PublicHeader isFixed />}
      <PublicHeader />
      <main
        className={
          isFullScreen ? 'flex w-full flex-1 flex-col' : 'mx-auto w-full max-w-main flex-1 px-4 py-4 md:py-6'
        }
      >
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
