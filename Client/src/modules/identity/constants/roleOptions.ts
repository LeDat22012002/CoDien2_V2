/** Tên hiển thị nhóm quyền theo Permission.Module ở Server; module mới chưa khai báo thì hiện nguyên mã. */
export const PERMISSION_MODULE_LABELS: Record<string, string> = {
  dashboard: 'Tổng quan',
  employees: 'Nhân viên',
  users: 'Tài khoản',
  roles: 'Vai trò và phân quyền',
  pages: 'Trang và menu',
  organization: 'Tổ chức',
  documents: 'Văn bản',
  equipments: 'Thiết bị',
  incidents: 'Sự cố',
};

export const getPermissionModuleLabel = (module: string) => PERMISSION_MODULE_LABELS[module] ?? module;

/** Mã vai trò: khớp RoleRequestValidator ở Server. */
export const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;

/** Bỏ dấu, chữ thường để tìm kiếm tiếng Việt. */
export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
