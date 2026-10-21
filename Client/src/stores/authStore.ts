import { create } from 'zustand';
import type { CurrentUser, Me, MenuItem, RoleSummary } from '@/shared/types/auth';

/** unknown: chưa kiểm tra phiên (lúc mở app); anonymous: chưa đăng nhập hoặc phiên đã hết. */
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  isSuperAdmin: boolean;
  roles: RoleSummary[];
  permissions: string[];
  menu: MenuItem[];
  routes: string[];
  setProfile: (me: Me) => void;
  setUser: (user: CurrentUser) => void;
  clearSession: () => void;
}

const EMPTY_SESSION = {
  user: null,
  isSuperAdmin: false,
  roles: [],
  permissions: [],
  menu: [],
  routes: [],
} satisfies Partial<AuthState>;

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'unknown',
  ...EMPTY_SESSION,
  setProfile: (me) =>
    set({
      status: 'authenticated',
      user: me.user,
      isSuperAdmin: me.isSuperAdmin,
      roles: me.roles,
      permissions: me.permissions,
      menu: me.menu,
      routes: me.routes,
    }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ status: 'anonymous', ...EMPTY_SESSION }),
}));

/** Có ít nhất một trong các quyền. Chỉ dùng để ẩn/hiện, Server mới kiểm tra thật. */
export const useHasPermission = (...codes: string[]) =>
  useAuthStore((state) => state.isSuperAdmin || codes.some((code) => state.permissions.includes(code)));

/** Route khai báo trong bảng Page (vd "/employees") mà user được vào. */
export const useCanAccessRoute = (path: string) =>
  useAuthStore((state) => state.isSuperAdmin || state.routes.includes(path));
