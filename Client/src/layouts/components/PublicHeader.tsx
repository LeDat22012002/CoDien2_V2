import { LoginOutlined, MenuOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Drawer, Grid, Input } from 'antd';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import logo from '@/assets/images/Logo.png';
import { DEFAULT_PUBLIC_PATH } from '@/shared/constants/routes';
import { buildLoginPath } from '@/shared/utils/redirect';
import { useAuthStore } from '@/stores/authStore';
import { PublicNavigation } from '@/layouts/components/PublicNavigation';
import { UserDropdown } from '@/layouts/components/UserDropdown';
import { collectMenuLeaves } from '@/layouts/utils/menuItems';

const DRAWER_WIDTH = 300;

interface SearchBoxProps {
  className?: string;
}

/** Ô tìm kiếm bo tròn như hệ thống cũ, chưa gắn chức năng. */
const SearchBox = ({ className = '' }: SearchBoxProps) => (
  <Input
    size="large"
    allowClear
    aria-label="Tìm kiếm"
    placeholder="Tìm kiếm..."
    suffix={<SearchOutlined className="text-text-secondary" />}
    className={`rounded-full px-4 transition-all duration-300 placeholder:italic hover:border-primary focus-within:shadow-md ${className}`}
  />
);

interface AccountActionProps {
  isCompact: boolean;
}

const AccountAction = ({ isCompact }: AccountActionProps) => {
  const status = useAuthStore((state) => state.status);
  const menu = useAuthStore((state) => state.menu);
  const navigate = useNavigate();
  const location = useLocation();

  // Trang quản trị đầu tiên user được vào (bỏ qua "/" vì "/" chỉ chuyển về trang công khai mặc định)
  const adminPath = useMemo(() => collectMenuLeaves(menu).find((leaf) => leaf.path !== '/')?.path, [menu]);

  if (status === 'unknown') return null;
  if (status === 'authenticated') return <UserDropdown adminPath={adminPath} />;

  const handleLogin = () => navigate(buildLoginPath(`${location.pathname}${location.search}`));

  return isCompact ? (
    <Button type="text" className="size-11" icon={<LoginOutlined />} aria-label="Đăng nhập" onClick={handleLogin} />
  ) : (
    // Nút dạng viên thuốc xám, hover chuyển màu chủ đạo (giống nút Login hệ thống cũ)
    <Button
      shape="round"
      icon={<LoginOutlined />}
      iconPlacement="end"
      onClick={handleLogin}
      className="h-11 border-0 bg-slate-200 px-5 font-medium text-text shadow-md hover:bg-primary hover:text-white"
    >
      Đăng nhập
    </Button>
  );
};

interface PublicHeaderProps {
  /** Bản cố định ở đỉnh màn hình, hiện khi đã cuộn qua header thường (giống TopHeaderPublic cũ). */
  isFixed?: boolean;
}

/**
 * Header trang công khai.
 * ≥ lg: logo + menu ngang (dropdown khi hover) + ô tìm kiếm + tài khoản.
 * < lg: logo + tài khoản thu gọn + nút hamburger mở Drawer chứa ô tìm kiếm và menu.
 */
export const PublicHeader = ({ isFixed = false }: PublicHeaderProps) => {
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const positionClass = isFixed ? 'fixed inset-x-0 top-0 z-50 animate-slide-down' : 'relative z-10';

  return (
    <header className={`h-16 w-full bg-bg-container shadow-md ${positionClass}`}>
      <div className="mx-auto flex h-full w-full max-w-main items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-4 xl:gap-8">
          <Link to={DEFAULT_PUBLIC_PATH} aria-label="Về trang Lấy số văn bản" className="shrink-0">
            <img
              src={logo}
              alt="Hòa Phát Gang Thép"
              className="h-9 w-auto object-contain transition-transform duration-200 hover:scale-105 sm:h-10.5"
            />
          </Link>
          {isDesktop && <PublicNavigation mode="horizontal" className="min-w-0" />}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isDesktop && <SearchBox className="w-56 xl:w-72" />}
          <AccountAction isCompact={!isDesktop} />
          {!isDesktop && (
            <Button
              type="text"
              className="size-11"
              icon={<MenuOutlined />}
              aria-label="Mở menu"
              onClick={() => setIsDrawerOpen(true)}
            />
          )}
        </div>
      </div>

      {!isDesktop && (
        <Drawer
          title="Menu"
          placement="right"
          size={DRAWER_WIDTH}
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        >
          <SearchBox className="mb-3 w-full" />
          <PublicNavigation mode="inline" onNavigate={() => setIsDrawerOpen(false)} />
        </Drawer>
      )}
    </header>
  );
};
