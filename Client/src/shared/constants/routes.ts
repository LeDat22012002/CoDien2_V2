/** Không có trang chủ: "/" và logo header chuyển thẳng về trang Lấy số văn bản (khớp Path trong bảng Page). */
export const DEFAULT_PUBLIC_PATH = '/documents/issue';

/**
 * Các route có thật ở Client (khai báo trong routes/router.tsx), dùng để gợi ý / kiểm tra Path khi
 * quản lý trang và menu. Thêm route mới ở router thì bổ sung vào đây.
 */
export const APP_ROUTE_PATHS = [
  '/documents/issue',
  '/org/organizationalchart',
  '/incidents',
  '/admin/dashboard',
  '/admin/employees',
  '/admin/org-units',
  '/admin/position-levels',
  '/admin/users',
  '/admin/roles',
  '/admin/permissions',
  '/admin/pages',
] as const;
