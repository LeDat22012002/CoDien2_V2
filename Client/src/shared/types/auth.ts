/** Kiểu dữ liệu phiên đăng nhập, dùng chung cho axiosClient, stores, routes và layouts. */

export interface CurrentUser {
  id: number;
  employeeId: number;
  empCode: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface AuthResult {
  accessToken: string;
  expiresAt: string;
  user: CurrentUser;
}

export interface RoleSummary {
  id: number;
  code: string;
  name: string;
}

export interface MenuItem {
  code: string;
  title: string;
  path?: string | null;
  icon?: string | null;
  children: MenuItem[];
}

/** GET /api/auth/me: thông tin để dựng menu, chặn route và ẩn/hiện nút theo quyền. */
export interface Me {
  user: CurrentUser;
  isSuperAdmin: boolean;
  roles: RoleSummary[];
  permissions: string[];
  menu: MenuItem[];
  /** Mọi route user được vào, kể cả trang không hiện trên menu. */
  routes: string[];
}
