import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPage, deletePage, getPageTree, reorderPages, updatePage } from '@/modules/identity/api/pagesApi';
import { PUBLIC_MENU_QUERY_KEY } from '@/modules/identity/hooks/usePublicMenu';
import { useRefreshProfile } from '@/modules/identity/hooks/useRefreshProfile';
import type { PageRequest } from '@/modules/identity/types/pages';

export const PAGE_QUERY_KEYS = {
  tree: ['pages', 'tree'] as const,
};

export const usePageTree = () =>
  useQuery({
    queryKey: PAGE_QUERY_KEYS.tree,
    queryFn: getPageTree,
  });

/**
 * Sau khi ghi: tải lại cây trang, menu header công khai và menu / route của người đang đăng nhập
 * để Sider cập nhật ngay.
 */
const useInvalidatePages = () => {
  const queryClient = useQueryClient();
  const refreshProfile = useRefreshProfile();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: PAGE_QUERY_KEYS.tree }),
      queryClient.invalidateQueries({ queryKey: PUBLIC_MENU_QUERY_KEY }),
      refreshProfile(),
    ]);
};

export const useCreatePage = () => {
  const invalidate = useInvalidatePages();
  return useMutation({ mutationFn: createPage, onSuccess: invalidate });
};

export const useUpdatePage = () => {
  const invalidate = useInvalidatePages();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: PageRequest }) => updatePage(id, request),
    onSuccess: invalidate,
  });
};

export const useDeletePage = () => {
  const invalidate = useInvalidatePages();
  return useMutation({ mutationFn: deletePage, onSuccess: invalidate });
};

/** Lỗi cũng tải lại để bỏ thứ tự đã cập nhật lạc quan. */
export const useReorderPages = () => {
  const invalidate = useInvalidatePages();
  return useMutation({ mutationFn: reorderPages, onSettled: invalidate });
};
