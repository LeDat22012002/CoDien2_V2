import { ConfigProvider, Menu, type MenuProps } from 'antd';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { MEMBER_PATH_PREFIX } from '@/shared/constants/routes';
import { SIDER_MENU_THEME } from '@/shared/theme/theme';
import { useAuthStore } from '@/stores/authStore';
import { collectMenuLeaves, findActiveMenuLeaf, isRouteKey, toSiderMenuItems } from '@/layouts/utils/menuItems';

interface AppMenuProps {
  /** Sider đang thu gọn còn icon: nhóm hiển thị thành vạch ngăn. */
  isCollapsed?: boolean;
  /** Gọi sau khi chọn một trang (đóng Drawer trên điện thoại). */
  onNavigate?: () => void;
}

/**
 * Menu Sider dựng từ GET /api/auth/me: trang cá nhân (/member/...) dùng `memberMenu`,
 * còn lại dùng menu quản trị. Trang có trang con hiển thị thành nhóm có tiêu đề (xem toSiderMenuItems).
 */
export const AppMenu = ({ isCollapsed = false, onNavigate }: AppMenuProps) => {
  const { pathname } = useLocation();
  const isMemberArea = pathname.startsWith(MEMBER_PATH_PREFIX);
  const menu = useAuthStore((state) => (isMemberArea ? state.memberMenu : state.menu));
  const navigate = useNavigate();

  const items = useMemo(() => toSiderMenuItems(menu, isCollapsed), [menu, isCollapsed]);
  const leaves = useMemo(() => collectMenuLeaves(menu), [menu]);
  const activeLeaf = findActiveMenuLeaf(leaves, pathname);

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (!isRouteKey(key)) return;
    navigate(key);
    onNavigate?.();
  };

  return (
    <ConfigProvider theme={SIDER_MENU_THEME}>
      <Menu
        // Đổi khu vực thì dựng lại menu để mở đúng nhóm của trang đang xem
        key={isMemberArea ? 'member' : 'admin'}
        mode="inline"
        items={items}
        selectedKeys={activeLeaf ? [activeLeaf.path] : []}
        defaultOpenKeys={activeLeaf?.ancestorKeys}
        onClick={handleClick}
        className="app-sider-menu border-e-0! bg-transparent py-2"
      />
    </ConfigProvider>
  );
};
