/** Không có trang chủ: "/" và logo header chuyển thẳng về trang Lấy số văn bản (khớp Path trong bảng Page). */
export const DEFAULT_PUBLIC_PATH = '/documents/issue';

/** Trang cá nhân (menu Area MEMBER) nằm dưới tiền tố này; Sider đổi sang menu thành viên. */
export const MEMBER_PATH_PREFIX = '/member';

/** Trang mở khi bấm "Thông tin cá nhân". */
export const MEMBER_PROFILE_PATH = '/member/profile';

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
  '/admin/issued-documents',
  '/admin/document-templates',
  '/member/incidents',
  '/member/documents',
  '/member/profile',
  '/member/change-password',
] as const;
