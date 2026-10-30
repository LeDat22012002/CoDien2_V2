export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  /** Vai trò hệ thống (SUPER_ADMIN): toàn quyền, không sửa, không xóa. */
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissionCount: number;
}

export interface RoleDetail extends Role {
  permissionIds: number[];
}

/** Mã quyền do Server định nghĩa ("module.hành động"). */
export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  sortOrder: number;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

interface RoleRequestBase {
  name: string;
  description?: string;
  isActive: boolean;
  permissionIds: number[];
}

/** Mã viết hoa không dấu, số, '_' (vd HR_STAFF); không đổi sau khi tạo. */
export interface CreateRoleRequest extends RoleRequestBase {
  code: string;
}

export type UpdateRoleRequest = RoleRequestBase;
