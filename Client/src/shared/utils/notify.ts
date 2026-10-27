import { toast, type ToastOptions } from 'react-toastify';
import { getErrorMessage } from '@/shared/api/axiosClient';

/**
 * Thông báo dạng toast dùng chung toàn app. Module gọi qua `notify`, không import thẳng react-toastify,
 * để cấu hình nằm một chỗ (xem AppToastContainer) và dễ đổi thư viện sau này.
 * Truyền `toastId` khi cùng một thông báo có thể bắn liên tiếp (vd bấm đăng nhập sai nhiều lần) để không bị chồng.
 */
export const notify = {
  success: (message: string, options?: ToastOptions) => toast.success(message, options),
  info: (message: string, options?: ToastOptions) => toast.info(message, options),
  warning: (message: string, options?: ToastOptions) => toast.warning(message, options),
  error: (message: string, options?: ToastOptions) => toast.error(message, options),

  /** Lỗi gọi API: lấy thông báo tiếng Việt từ Server (hoặc thông báo mặc định theo mã lỗi). */
  apiError: (error: unknown, options?: ToastOptions) => toast.error(getErrorMessage(error), options),

  dismiss: (toastId?: string) => toast.dismiss(toastId),
};
