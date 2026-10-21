import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { setAccessToken } from '@/shared/api/axiosClient';
import { logout } from '@/modules/identity/api/identityApi';
import { useAuthStore } from '@/stores/authStore';

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useCallback(async () => {
    try {
      await logout();
    } catch {
      // Lỗi mạng khi đăng xuất vẫn xóa phiên phía Client
    }
    setAccessToken(null);
    clearSession();
    queryClient.clear();
    // Trang chủ công khai nên đăng xuất xong vẫn ở lại app
    navigate('/', { replace: true });
  }, [clearSession, navigate, queryClient]);
};
