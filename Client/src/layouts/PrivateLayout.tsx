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

/** Logo đầu Sider cao bằng header, cùng nền trắng để Sider và header liền một khối. */
const SiderBrand = ({ isCollapsed }: SiderBrandProps) => (
  <Link
    to="/"
    aria-label="Về trang chủ"
    className="flex h-14 shrink-0 items-center justify-center border-b border-border px-3"
  >
    {isCollapsed ? (
      <img src={logoIcon} alt={LOGO_ALT} className="h-8 w-auto" />
    ) : (
      <img src={logo} alt={LOGO_ALT} className="h-10 w-auto max-w-full object-contain" />
    )}
  </Link>
);

interface SiderContentProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

/** Ruột Sider / Drawer: logo, menu (cuộn riêng), chân ghi tên đơn vị. */
const SiderContent = ({ isCollapsed = false, onNavigate }: SiderContentProps) => (
  <div className="flex h-full flex-col">
    <SiderBrand isCollapsed={isCollapsed} />
    <div className="min-h-0 flex-1 overflow-y-auto">
      <AppMenu isCollapsed={isCollapsed} onNavigate={onNavigate} />
    </div>
    {!isCollapsed && (
      <div className="shrink-0 border-t border-border px-4 py-3 text-xs leading-snug text-text-secondary">
        <div className="font-semibold text-text">Nhà máy Cơ điện 2</div>
        <div>Hòa Phát Dung Quất</div>
      </div>
    )}
  </div>
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
          <SiderContent onNavigate={() => setIsDrawerOpen(false)} />
        </Drawer>
      ) : (
        <Layout.Sider
          width={SIDER_WIDTH}
          breakpoint="lg"
          collapsible
          collapsed={isCollapsed}
          onBreakpoint={setIsCollapsed}
          trigger={null}
          theme="light"
          className="sticky top-0 h-dvh border-e border-border"
        >
          <SiderContent isCollapsed={isCollapsed} />
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
          {/* flex để nút không căn theo line-height 56px của Header (lệch lên trên) */}
          <div className="ml-auto flex items-center">
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
