import { Menu, type MenuProps } from "antd";
import { useMemo, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { usePublicMenu } from "@/modules/identity/hooks/usePublicMenu";
import type { MenuItem } from "@/shared/types/auth";
import {
  collectMenuLeaves,
  findActiveMenuLeaf,
  getMenuItemKey,
  isRouteKey,
  toMenuItems,
  type MenuLeaf,
} from "@/layouts/utils/menuItems";

/** Mục cấp 1: chữ hoa, đậm, gạch chân chạy từ trái sang khi hover (giống DropdownItem hệ thống cũ). */
const NAV_ITEM_CLASS =
  "relative inline-flex h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap px-3 text-sm font-semibold uppercase transition-colors duration-200 after:absolute after:inset-x-3 after:bottom-1.5 after:h-[3px] after:origin-left after:bg-primary after:transition-transform after:duration-300 after:content-['']";
const NAV_ITEM_ACTIVE_CLASS = "text-primary after:scale-x-100";
const NAV_ITEM_IDLE_CLASS =
  "text-text after:scale-x-0 hover:text-primary hover:after:scale-x-100 focus-visible:text-primary";

/** Mục trong menu con: chữ thường, đậm, nền xám khi hover, không icon (giống submenu hệ thống cũ). */
const SUB_ITEM_CLASS =
  "block w-full cursor-pointer whitespace-nowrap px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-200";
const SUB_ITEM_ACTIVE_CLASS = "text-primary";
const SUB_ITEM_IDLE_CLASS = "text-text hover:text-primary";

/**
 * Menu con mở khi hover (hoặc khi có focus bên trong, để dùng được bằng bàn phím/cảm ứng).
 * Cấp 1 xổ xuống sát mép dưới header; cấp sâu hơn mở sang phải.
 * before: dải trong suốt nối khoảng hở với mục cha để rê chuột xuống không bị đóng.
 */
const SUBMENU_CLASS = {
  root: "left-0 top-full mt-2.5 before:absolute before:inset-x-0 before:-top-2.5 before:h-2.5 before:content-['']",
  nested: "left-full top-0",
};

const isItemActive = (item: MenuItem, activeLeaf: MenuLeaf | undefined) =>
  Boolean(activeLeaf) &&
  (activeLeaf?.path === item.path ||
    Boolean(activeLeaf?.ancestorKeys.includes(getMenuItemKey(item))));

/** Click xong thì bỏ focus để menu con (mở theo focus-within) đóng lại. */
const handleBlurOnClick = (event: MouseEvent<HTMLElement>) =>
  event.currentTarget.blur();

interface NavItemProps {
  item: MenuItem;
  activeLeaf?: MenuLeaf;
  level?: number;
}

const NavItem = ({ item, activeLeaf, level = 0 }: NavItemProps) => {
  const isRoot = level === 0;
  const isActive = isItemActive(item, activeLeaf);
  const className = isRoot
    ? `${NAV_ITEM_CLASS} ${isActive ? NAV_ITEM_ACTIVE_CLASS : NAV_ITEM_IDLE_CLASS}`
    : `${SUB_ITEM_CLASS} ${isActive ? SUB_ITEM_ACTIVE_CLASS : SUB_ITEM_IDLE_CLASS}`;

  const renderLabel = () => {
    if (item.children.length > 0) {
      return (
        <button
          type="button"
          aria-haspopup="true"
          className={`border-0 bg-transparent ${className}`}
        >
          {item.title}
        </button>
      );
    }

    if (item.externalUrl) {
      return (
        <a
          href={item.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={handleBlurOnClick}
        >
          {item.title}
          <span className="sr-only"> (mở tab mới)</span>
        </a>
      );
    }

    if (item.path) {
      return (
        <Link to={item.path} className={className} onClick={handleBlurOnClick}>
          {item.title}
        </Link>
      );
    }

    return <span className={className}>{item.title}</span>;
  };

  return (
    <div className="group relative">
      {renderLabel()}

      {item.children.length > 0 && (
        <ul
          className={`absolute z-50 ml-2.5 hidden min-w-44 list-none border border-solid border-border bg-bg-container p-0 shadow-md animate-slide-down group-hover:block group-focus-within:block ${
            isRoot ? SUBMENU_CLASS.root : SUBMENU_CLASS.nested
          }`}
        >
          {item.children.map((child) => (
            <li key={child.code} className="hover:bg-slate-200">
              <NavItem item={child} activeLeaf={activeLeaf} level={level + 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface PublicNavigationProps {
  /** horizontal: thanh menu trên header (≥ lg); inline: trong Drawer trên điện thoại/tablet. */
  mode: "horizontal" | "inline";
  className?: string;
  onNavigate?: () => void;
}

/**
 * Menu header trang công khai, lấy từ trang Area PUBLIC (GET /api/pages/public-menu).
 * Đang tải, lỗi hoặc rỗng thì không hiện menu; header vẫn dùng được.
 */
export const PublicNavigation = ({
  mode,
  className = "",
  onNavigate,
}: PublicNavigationProps) => {
  const { data: menu = [] } = usePublicMenu();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = useMemo(
    () => toMenuItems(menu, { showFallbackIcon: false }),
    [menu],
  );
  const leaves = useMemo(() => collectMenuLeaves(menu), [menu]);
  const activeLeaf = findActiveMenuLeaf(leaves, pathname);

  if (menu.length === 0) return <div className={className} />;

  if (mode === "horizontal") {
    return (
      <nav aria-label="Menu chính" className={className}>
        <ul className="m-0 flex list-none items-center gap-2 p-0">
          {menu.map((item) => (
            <li key={item.code}>
              <NavItem item={item} activeLeaf={activeLeaf} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  const handleClick: MenuProps["onClick"] = ({ key }) => {
    if (!isRouteKey(key)) return;
    navigate(key);
    onNavigate?.();
  };

  return (
    <nav aria-label="Menu chính" className={className}>
      <Menu
        mode="inline"
        items={items}
        selectedKeys={activeLeaf ? [activeLeaf.path] : []}
        defaultOpenKeys={activeLeaf?.ancestorKeys}
        onClick={handleClick}
        className="border-e-0 font-medium"
      />
    </nav>
  );
};
