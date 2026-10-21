import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/axiosClient';

const MAX_RETRY_COUNT = 2;

/** Lỗi 4xx (sai dữ liệu, không có quyền, không tìm thấy) thử lại cũng không khác, chỉ retry lỗi mạng/5xx. */
const shouldRetry = (failureCount: number, error: unknown) => {
  const status = error instanceof ApiError ? error.status : undefined;
  if (status && status < 500) return false;
  return failureCount < MAX_RETRY_COUNT;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});
