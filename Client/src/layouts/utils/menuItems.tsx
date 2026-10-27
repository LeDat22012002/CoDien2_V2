import { ExportOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { getMenuIcon } from '@/shared/constants/menuIcons';
import type { MenuItem } from '@/shared/types/auth';

/** Dùng chung cho menu quản trị (Sider) và menu header trang công khai. */

type AntdMenuItem = Required<MenuProps>['items'][number];

export interface MenuLeaf {
  path: string;
  ancestorKeys: string[];
}

interface ToMenuItemsOptions {
  /** Menu header công khai không hiện icon (trừ khi trang có khai báo icon). */
  showFallbackIcon?: boolean;
}

/** Trang nội bộ dùng path làm key (onClick điều hướng thẳng); nút nhóm và liên kết ngoài dùng code. */
export const getMenuItemKey = (item: MenuItem) => item.path ?? item.code;

export const isRouteKey = (key: string) => key.startsWith('/');

const renderLabel = (item: MenuItem) =>
  item.externalUrl ? (
    <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
      {item.title}
      <ExportOutlined className="ml-1.5 text-xs" aria-label="(mở tab mới)" />
    </a>
  ) : (
    item.title
  );

export const toMenuItems = (items: MenuItem[], options: ToMenuItemsOptions = {}): AntdMenuItem[] => {
  const { showFallbackIcon = true } = options;
  return items.map((item) => ({
    key: getMenuItemKey(item),
    icon: showFallbackIcon || item.icon ? getMenuIcon(item.icon) : undefined,
    label: renderLabel(item),
    children: item.children.length > 0 ? toMenuItems(item.children, options) : undefined,
  }));
};

export const collectMenuLeaves = (items: MenuItem[], ancestorKeys: string[] = []): MenuLeaf[] =>
  items.flatMap((item) =>
    item.children.length > 0
      ? collectMenuLeaves(item.children, [...ancestorKeys, getMenuItemKey(item)])
      : item.path
        ? [{ path: item.path, ancestorKeys }]
        : [],
  );

/** Trang khớp dài nhất với URL hiện tại, để trang con (vd /documents/templates) vẫn sáng đúng mục. */
export const findActiveMenuLeaf = (leaves: MenuLeaf[], pathname: string) =>
  leaves
    .filter(({ path }) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
