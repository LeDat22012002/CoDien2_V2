import { MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, Drawer, Grid, Layout } from 'antd';
import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import logo from '@/assets/images/Logo.png';
import logoIcon from '@/assets/images/LogoHP.png';
import { SIDER_WIDTH } from '@/shared/theme/theme';
import { AppMenu } from '@/layouts/components/AppMenu';
import { UserDropdown } from '@/layouts/components/UserDropdown';

const LOGO_ALT = 'Hòa Phát Gang Thép';

interface SiderBrandProps {
  isCollapsed?: boolean;
}

/** Logo đầu Sider trên dải trắng cao bằng header (logo màu xanh không đọc được trên nền Sider navy). */
const SiderBrand = ({ isCollapsed }: SiderBrandProps) => (
  <Link
    to="/"
    aria-label="Về trang chủ"
    className="flex h-14 items-center justify-center border-b border-border bg-bg-container px-3"
  >
    {isCollapsed ? (
      <img src={logoIcon} alt={LOGO_ALT} className="h-8 w-auto" />
    ) : (
      <img src={logo} alt={LOGO_ALT} className="h-10 w-auto max-w-full object-contain" />
    )}
  </Link>
);

/**
 * Layout chung cho các trang sau đăng nhập: quản trị, thông tin cá nhân (luôn nằm sau PrivateRoute).
 * Điện thoại (< md): menu trong Drawer, mở bằng nút hamburger.
 * Tablet (md–lg): Sider tự thu gọn còn icon. Laptop trở lên (≥ lg): Sider mở rộng, có nút thu gọn.
 */
const PrivateLayout = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
          {isMobile && (
            <Link to="/" aria-label="Về trang chủ" className="flex items-center">
              <img src={logo} alt={LOGO_ALT} className="h-8 w-auto" />
            </Link>
          )}
          <div className="ml-auto">
            <UserDropdown />
          </div>
        </Layout.Header>

        <Layout.Content className="p-4 md:p-6">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default PrivateLayout;
