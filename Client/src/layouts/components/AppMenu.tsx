import { Menu, type MenuProps } from 'antd';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { collectMenuLeaves, findActiveMenuLeaf, isRouteKey, toMenuItems } from '@/layouts/utils/menuItems';

interface AppMenuProps {
  /** Gọi sau khi chọn một trang (đóng Drawer trên điện thoại). */
  onNavigate?: () => void;
}

/** Menu Sider trang quản trị, dựng từ GET /api/auth/me → menu. */
export const AppMenu = ({ onNavigate }: AppMenuProps) => {
  const menu = useAuthStore((state) => state.menu);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = useMemo(() => toMenuItems(menu), [menu]);
  const leaves = useMemo(() => collectMenuLeaves(menu), [menu]);
  const activeLeaf = findActiveMenuLeaf(leaves, pathname);

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (!isRouteKey(key)) return;
    navigate(key);
    onNavigate?.();
  };

  return (
    <Menu
      theme="dark"
      mode="inline"
      items={items}
      selectedKeys={activeLeaf ? [activeLeaf.path] : []}
      defaultOpenKeys={activeLeaf?.ancestorKeys}
      onClick={handleClick}
    />
  );
};
