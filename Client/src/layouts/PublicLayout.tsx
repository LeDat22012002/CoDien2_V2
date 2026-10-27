import { Outlet } from 'react-router';
import { useIsScrolledPast } from '@/shared/hooks/useIsScrolledPast';
import { useSessionBootstrap } from '@/modules/identity/hooks/useSessionBootstrap';
import { PublicHeader } from '@/layouts/components/PublicHeader';

/** Cuộn quá header thường (64px) một chút thì hiện header cố định, như hệ thống cũ. */
const FIXED_HEADER_SCROLL_THRESHOLD = 80;

/**
 * Layout trang công khai (kiểu landing page): header ngang, nội dung rộng tối đa 1400px, không footer.
 * Không chặn khi chưa đăng nhập; khôi phục phiên nền để header hiện đúng nút Đăng nhập / tài khoản.
 */
const PublicLayout = () => {
  useSessionBootstrap();
  const isFixedHeaderVisible = useIsScrolledPast(FIXED_HEADER_SCROLL_THRESHOLD);

  return (
    <div className="flex min-h-dvh flex-col">
      {isFixedHeaderVisible && <PublicHeader isFixed />}
      <PublicHeader />
      <main className="mx-auto w-full max-w-main flex-1 px-4 py-4 md:py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
