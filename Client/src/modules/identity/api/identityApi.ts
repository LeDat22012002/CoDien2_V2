import { httpGet, httpPost } from '@/shared/api/axiosClient';
import type { AuthResult, Me } from '@/shared/types/auth';

export interface LoginRequest {
  empCode: string;
  password: string;
}

export const login = (request: LoginRequest) => httpPost<AuthResult>('/auth/login', request);

export const logout = () => httpPost<null>('/auth/logout');

export const getMe = () => httpGet<Me>('/auth/me');
