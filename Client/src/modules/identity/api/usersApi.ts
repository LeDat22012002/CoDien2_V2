import { httpDelete, httpGet, httpPost, httpPut } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type {
  AvailableEmployee,
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserFilter,
} from '@/modules/identity/types/users';

/** keyword tìm theo mã NV, họ tên, email. */
export const getUsers = (filter: UserFilter) => httpGet<PagedResult<User>>('/users', filter);

/** Nhân viên đang làm việc chưa có tài khoản (tối đa 50 người). */
export const getAvailableEmployees = (keyword: string) =>
  httpGet<AvailableEmployee[]>('/users/available-employees', { keyword: keyword || undefined });

export const createUser = (request: CreateUserRequest) => httpPost<User>('/users', request);

export const updateUser = (id: number, request: UpdateUserRequest) => httpPut<User>(`/users/${id}`, request);

export const resetUserPassword = (id: number, newPassword: string) =>
  httpPost<null>(`/users/${id}/reset-password`, { newPassword });

export const unlockUser = (id: number) => httpPost<null>(`/users/${id}/unlock`);

/** Xóa mềm, Server thu hồi mọi phiên đăng nhập của tài khoản. */
export const deleteUser = (id: number) => httpDelete<null>(`/users/${id}`);
