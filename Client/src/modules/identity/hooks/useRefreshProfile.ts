import { getMe } from '@/modules/identity/api/identityApi';
import { useAuthStore } from '@/stores/authStore';

/**
 * Tải lại quyền, menu, route của người đang đăng nhập (sau khi đổi quyền của vai trò mình đang giữ,
 * hoặc sửa trang / menu) để Sider và nút ẩn/hiện cập nhật ngay, không cần đăng nhập lại.
 */
export const useRefreshProfile = () => {
  const setProfile = useAuthStore((state) => state.setProfile);
  return async () => {
    try {
      setProfile(await getMe());
    } catch {
      // Lỗi phiên đã được axiosClient xử lý; lần tải trang sau sẽ có quyền mới
    }
  };
};
