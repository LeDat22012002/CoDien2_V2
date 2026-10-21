import { Menu, type MenuProps } from 'antd';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getMenuIcon } from '@/shared/constants/menuIcons';
import type { MenuItem } from '@/shared/types/auth';
import { useAuthStore } from '@/stores/authStore';

type MenuItemType = Required<MenuProps>['items'][number];

interface MenuLeaf {
  path: string;
  ancestorKeys: string[];
}

interface AppMenuProps {
  /** Gọi sau khi chọn một trang (đóng Drawer trên điện thoại). */
  onNavigate?: () => void;
}

/** Menu khi chưa đăng nhập: chỉ các trang công khai. Đăng nhập rồi thì dùng menu Server trả về. */
const PUBLIC_MENU: MenuItem[] = [
  { code: 'dashboard', title: 'Tổng quan', path: '/', icon: 'DashboardOutlined', children: [] },
];

/** Nút nhóm dùng code làm key, trang dùng path làm key để điều hướng trực tiếp. */
const getItemKey = (item: MenuItem) => item.path ?? item.code;

const toMenuItems = (items: MenuItem[]): MenuItemType[] =>
  items.map((item) => ({
    key: getItemKey(item),
    icon: getMenuIcon(item.icon),
    label: item.title,
    children: item.children.length > 0 ? toMenuItems(item.children) : undefined,
  }));

const collectLeaves = (items: MenuItem[], ancestorKeys: string[] = []): MenuLeaf[] =>
  items.flatMap((item) =>
    item.children.length > 0
      ? collectLeaves(item.children, [...ancestorKeys, getItemKey(item)])
      : item.path
        ? [{ path: item.path, ancestorKeys }]
        : [],
  );

/** Trang khớp dài nhất với URL hiện tại, để trang con (vd /documents/templates) vẫn sáng đúng mục. */
const findActiveLeaf = (leaves: MenuLeaf[], pathname: string) =>
  leaves
    .filter(({ path }) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];

export const AppMenu = ({ onNavigate }: AppMenuProps) => {
  const menu = useAuthStore((state) => (state.status === 'authenticated' ? state.menu : PUBLIC_MENU));
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = useMemo(() => toMenuItems(menu), [menu]);
  const leaves = useMemo(() => collectLeaves(menu), [menu]);
  const activeLeaf = findActiveLeaf(leaves, pathname);

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (!key.startsWith('/')) return;
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
