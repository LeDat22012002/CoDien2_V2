import { httpGet, httpPost } from '@/shared/api/axiosClient';
import type { AuthResult, Me, MenuItem } from '@/shared/types/auth';
import type { LoginRequest } from '@/modules/identity/types/identity';

export const login = (request: LoginRequest) => httpPost<AuthResult>('/auth/login', request);

export const logout = () => httpPost<null>('/auth/logout');

export const getMe = () => httpGet<Me>('/auth/me');

/** Menu header trang công khai (trang Area PUBLIC), không cần đăng nhập. */
export const getPublicMenu = () => httpGet<MenuItem[]>('/pages/public-menu');
