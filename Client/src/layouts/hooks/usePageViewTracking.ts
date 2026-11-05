import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import type { MenuItem } from '@/shared/types/auth';
import { useAuthStore } from '@/stores/authStore';
import { createPageView } from '@/modules/auditLogs/api/auditLogsApi';
import { PUBLIC_MENU_QUERY_KEY } from '@/modules/identity/hooks/usePublicMenu';

const findMenuTitle = (items: MenuItem[], path: string): string | undefined => {
  for (const item of items) {
    if (item.path === path) return item.title;
    const childTitle = findMenuTitle(item.children, path);
    if (childTitle) return childTitle;
  }
  return undefined;
};

/**
 * Ghi nhật ký mỗi lần người đã đăng nhập mở trang (đổi pathname; đổi query như phân trang / bộ lọc không tính).
 * Tên trang lấy theo menu quản trị, menu cá nhân, menu công khai. Lỗi ghi bỏ qua, không làm phiền người dùng.
 * Dùng ở PublicLayout và PrivateLayout.
 */
export const usePageViewTracking = () => {
  const { pathname } = useLocation();
  const status = useAuthStore((state) => state.status);
  const queryClient = useQueryClient();
  // Chặn ghi trùng khi effect chạy lại (StrictMode, render lại) cho cùng 1 trang
  const lastPathRef = useRef<string>(undefined);

  useEffect(() => {
    if (status !== 'authenticated') {
      lastPathRef.current = undefined;
      return;
    }
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    const { menu, memberMenu } = useAuthStore.getState();
    const publicMenu = queryClient.getQueryData<MenuItem[]>(PUBLIC_MENU_QUERY_KEY) ?? [];
    const title = findMenuTitle([...menu, ...memberMenu, ...publicMenu], pathname);

    createPageView({ path: pathname, title }).catch(() => undefined);
  }, [pathname, status, queryClient]);
};
