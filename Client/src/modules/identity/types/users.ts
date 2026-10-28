import type { RoleSummary } from '@/shared/types/auth';
import type { PagedRequest } from '@/shared/types/api';

/** Tài khoản đăng nhập, gắn với 1 nhân viên (đăng nhập bằng mã NV). */
export interface User {
  id: number;
  employeeId: number;
  empCode: string;
  fullName: string;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  employeeStatus: 'ACTIVE' | 'INACTIVE';
  /** Vị trí chính đang giữ trên sơ đồ tổ chức. */
  jobTitle?: string | null;
  orgUnitName?: string | null;
  isActing: boolean;
  isActive: boolean;
  /** Đang bị khóa tạm do đăng nhập sai nhiều lần. */
  isLocked: boolean;
  lockoutEnd?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  roles: RoleSummary[];
}

/** Nhân viên đang làm việc, chưa có tài khoản. */
export interface AvailableEmployee {
  id: number;
  empCode: string;
  fullName: string;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  orgUnitName?: string | null;
}

export interface UserFilter extends PagedRequest {
  roleId?: number;
  isActive?: boolean;
  isLocked?: boolean;
}

/** Tên đăng nhập = mã nhân viên; tài khoản mới luôn hoạt động. */
export interface CreateUserRequest {
  employeeId: number;
  password: string;
  roleIds: number[];
}

export interface UpdateUserRequest {
  isActive: boolean;
  roleIds: number[];
}
