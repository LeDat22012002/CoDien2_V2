import type { CSSProperties } from 'react';
import { ToastContainer } from 'react-toastify';
import { BORDER_RADIUS, COLORS, FONT_FAMILY } from '@/shared/theme/theme';

/** Font, màu trạng thái và bo góc của toast lấy từ theme (biến CSS của react-toastify, áp cho mọi toast con). */
const TOAST_THEME_STYLE = {
  '--toastify-font-family': FONT_FAMILY,
  '--toastify-color-success': COLORS.success,
  '--toastify-color-warning': COLORS.warning,
  '--toastify-color-error': COLORS.error,
  '--toastify-color-info': COLORS.info,
  '--toastify-toast-bd-radius': `${BORDER_RADIUS}px`,
} as CSSProperties;

/**
 * Nơi hiển thị toast cho toàn app, đặt một lần trong App.tsx.
 * Gọi bằng `toast.success/error/...` từ 'react-toastify'.
 */
export const AppToastContainer = () => (
  <ToastContainer
    position="top-right"
    autoClose={4000}
    newestOnTop
    closeOnClick
    pauseOnHover
    style={TOAST_THEME_STYLE}
  />
);
