import { LoginOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, Drawer, Grid, Layout } from 'antd';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { FullPageLoading } from '@/shared/components/FullPageLoading';
import { SIDER_WIDTH } from '@/shared/theme/theme';
import { buildLoginPath } from '@/shared/utils/redirect';
import { useSessionBootstrap } from '@/modules/identity/hooks/useSessionBootstrap';
import { AppMenu } from '@/layouts/components/AppMenu';
import { UserDropdown } from '@/layouts/components/UserDropdown';

const APP_NAME = 'Nhà máy Cơ điện 2';
const APP_SHORT_NAME = 'CĐ2';

interface SiderBrandProps {
  isCollapsed?: boolean;
}

const SiderBrand = ({ isCollapsed }: SiderBrandProps) => (
  <div className="flex h-14 items-center px-4 text-base font-semibold text-white">
    <span className="truncate">{isCollapsed ? APP_SHORT_NAME : APP_NAME}</span>
  </div>
);

/**
 * Điện thoại (< md): menu trong Drawer, mở bằng nút hamburger.
 * Tablet (md–lg): Sider tự thu gọn còn icon. Laptop trở lên (≥ lg): Sider mở rộng, có nút thu gọn.
 * Dùng cho cả trang công khai (trang chủ) lẫn trang cần đăng nhập; chưa đăng nhập thì header hiện nút Đăng nhập.
 */
const MainLayout = () => {
  const status = useSessionBootstrap();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (status === 'unknown') return <FullPageLoading />;

  const handleToggleMenu = () => {
    if (isMobile) setIsDrawerOpen(true);
    else setIsCollapsed((collapsed) => !collapsed);
  };

  const toggleIcon = isMobile ? <MenuOutlined /> : isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />;

  return (
    <Layout hasSider className="min-h-dvh">
      {isMobile ? (
        <Drawer
          placement="left"
          size={SIDER_WIDTH}
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          closable={false}
          styles={{ body: { padding: 0 } }}
          classNames={{ body: 'bg-sider' }}
        >
          <SiderBrand />
          <AppMenu onNavigate={() => setIsDrawerOpen(false)} />
        </Drawer>
      ) : (
        <Layout.Sider
          width={SIDER_WIDTH}
          breakpoint="lg"
          collapsible
          collapsed={isCollapsed}
          onBreakpoint={setIsCollapsed}
          trigger={null}
          className="sticky top-0 h-dvh overflow-y-auto"
        >
          <SiderBrand isCollapsed={isCollapsed} />
          <AppMenu />
        </Layout.Sider>
      )}

      <Layout className="min-w-0">
        <Layout.Header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border">
          <Button
            type="text"
            className="size-11"
            icon={toggleIcon}
            aria-label={isMobile ? 'Mở menu' : isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            onClick={handleToggleMenu}
          />
          {isMobile && <span className="truncate text-base font-semibold">{APP_NAME}</span>}
          <div className="ml-auto">
            {status === 'authenticated' ? (
              <UserDropdown />
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => navigate(buildLoginPath(`${location.pathname}${location.search}`))}
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </Layout.Header>

        <Layout.Content className="p-4 md:p-6">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
