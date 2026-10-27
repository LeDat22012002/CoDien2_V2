import { useQuery } from '@tanstack/react-query';
import { getPublicMenu } from '@/modules/identity/api/identityApi';

/** Sửa trang PUBLIC ở màn quản lý trang thì invalidate key này để header cập nhật. */
export const PUBLIC_MENU_QUERY_KEY = ['public-menu'] as const;

export const usePublicMenu = () =>
  useQuery({
    queryKey: PUBLIC_MENU_QUERY_KEY,
    queryFn: getPublicMenu,
    staleTime: 5 * 60_000,
  });
