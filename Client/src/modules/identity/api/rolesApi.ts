import { httpDelete, httpGet, httpPost, httpPut } from '@/shared/api/axiosClient';
import type {
  CreateRoleRequest,
  Permission,
  PermissionGroup,
  Role,
  RoleDetail,
  UpdatePermissionRequest,
  UpdateRoleRequest,
} from '@/modules/identity/types/roles';

/** Mọi vai trò (cần roles.view hoặc users.view). */
export const getRoles = () => httpGet<Role[]>('/roles');

/** Kèm danh sách id quyền đã gán. */
export const getRoleById = (id: number) => httpGet<RoleDetail>(`/roles/${id}`);

export const createRole = (request: CreateRoleRequest) => httpPost<RoleDetail>('/roles', request);

/** Gửi đủ danh sách quyền; Server tự tính quyền thêm / bớt. */
export const updateRole = (id: number, request: UpdateRoleRequest) => httpPut<RoleDetail>(`/roles/${id}`, request);

/** Chỉ xóa được khi không còn tài khoản nào giữ vai trò. */
export const deleteRole = (id: number) => httpDelete<null>(`/roles/${id}`);

/** Quyền nhóm theo module, đã sắp xếp. */
export const getPermissionGroups = () => httpGet<PermissionGroup[]>('/permissions');

export const updatePermission = (id: number, request: UpdatePermissionRequest) =>
  httpPut<Permission>(`/permissions/${id}`, request);
