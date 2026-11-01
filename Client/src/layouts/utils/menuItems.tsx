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

/**
 * Menu Sider: trang cấp 1 có trang con hiển thị thành nhóm có tiêu đề (luôn mở) thay vì submenu đóng/mở;
 * các trang cấp 1 đứng liền nhau gom vào một nhóm không tiêu đề. Sider thu gọn thì nhóm thành vạch ngăn.
 */
export const toSiderMenuItems = (items: MenuItem[], isCollapsed: boolean): AntdMenuItem[] => {
  const sections: { key: string; title?: string; items: MenuItem[] }[] = [];
  items.forEach((item) => {
    if (item.children.length > 0) {
      sections.push({ key: getMenuItemKey(item), title: item.title, items: item.children });
      return;
    }
    const last = sections.at(-1);
    if (last && !last.title) last.items.push(item);
    else sections.push({ key: `section-${getMenuItemKey(item)}`, items: [item] });
  });

  return sections.flatMap((section, index): AntdMenuItem[] => {
    const children = toMenuItems(section.items);
    if (isCollapsed) {
      return index > 0 ? [{ type: 'divider', key: `divider-${section.key}` }, ...children] : children;
    }
    return section.title ? [{ type: 'group', key: section.key, label: section.title, children }] : children;
  });
};

export const collectMenuLeaves =(items: MenuItem[], ancestorKeys: string[] = []): MenuLeaf[] =>
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
