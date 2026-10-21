import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse } from '@/shared/types/api';
import type { AuthResult } from '@/shared/types/auth';

/**
 * Access token chỉ giữ trong bộ nhớ (không lưu localStorage). Refresh token nằm trong cookie HttpOnly
 * Path=/api/auth do Server đặt, trình duyệt tự gửi kèm khi gọi /api/auth/refresh.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const REQUEST_TIMEOUT_MS = 30_000;
const REFRESH_URL = '/auth/refresh';
const SKIP_REFRESH_URLS = ['/auth/login', '/auth/refresh', '/auth/logout'];
/** Khóa dùng chung giữa các tab: refresh token xoay vòng, gửi lại token cũ sẽ bị Server thu hồi mọi phiên. */
const REFRESH_LOCK_NAME = 'nm-codien2-auth-refresh';

const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu không hợp lệ.',
  401: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu.',
  429: 'Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau.',
  500: 'Máy chủ gặp lỗi, vui lòng thử lại sau.',
};

export class ApiError extends Error {
  readonly status?: number;
  readonly errors?: Record<string, string[]>;

  constructor(message: string, status?: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export interface AuthHandlers {
  onSessionRefreshed?: (result: AuthResult) => void;
  onSessionExpired?: () => void;
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  isRetried?: boolean;
}

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResult> | null = null;
let authHandlers: AuthHandlers = {};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const configureAuthHandlers = (handlers: AuthHandlers) => {
  authHandlers = handlers;
};

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (!error.response) {
      const message = error.code === AxiosError.ECONNABORTED
        ? 'Máy chủ phản hồi quá lâu, vui lòng thử lại.'
        : 'Không kết nối được máy chủ, vui lòng kiểm tra mạng.';
      return new ApiError(message);
    }

    const { status, data } = error.response;
    const message = data?.message
      || DEFAULT_ERROR_MESSAGES[status]
      || (status >= 500 ? DEFAULT_ERROR_MESSAGES[500] : DEFAULT_ERROR_MESSAGES[400]);
    return new ApiError(message, status, data?.errors ?? undefined);
  }

  return new ApiError(error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.');
};

export const getErrorMessage = (error: unknown) => toApiError(error).message;

const runExclusive = <T>(task: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(REFRESH_LOCK_NAME, task)
    : task();

const requestRefresh = async (): Promise<AuthResult> => {
  const response = await axios.post<ApiResponse<AuthResult>>(`${API_BASE_URL}${REFRESH_URL}`, null, {
    withCredentials: true,
    timeout: REQUEST_TIMEOUT_MS,
  });
  if (!response.data.data) throw new ApiError(DEFAULT_ERROR_MESSAGES[401], 401);
  return response.data.data;
};

/** Gom các lần gọi đồng thời thành một request refresh duy nhất. */
export const refreshSession = (): Promise<AuthResult> => {
  refreshPromise ??= runExclusive(requestRefresh)
    .then((result) => {
      setAccessToken(result.accessToken);
      authHandlers.onSessionRefreshed?.(result);
      return result;
    })
    .catch((error: unknown) => {
      setAccessToken(null);
      throw toApiError(error);
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

const isSkipRefreshUrl = (url?: string) => SKIP_REFRESH_URLS.some((path) => url?.endsWith(path));

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
  // Mảng gửi dạng ids=1&ids=2 cho ASP.NET Core bind được
  paramsSerializer: { indexes: null },
});

axiosClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const config = axios.isAxiosError(error) ? (error.config as RetriableRequestConfig | undefined) : undefined;
    const isUnauthorized = axios.isAxiosError(error) && error.response?.status === 401;

    if (isUnauthorized && config && !config.isRetried && !isSkipRefreshUrl(config.url)) {
      config.isRetried = true;
      try {
        await refreshSession();
        return axiosClient(config);
      } catch {
        authHandlers.onSessionExpired?.();
      }
    }

    return Promise.reject(toApiError(error));
  },
);

const unwrap = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data.data as T;

/** Các hàm gọi API trả thẳng phần `data` của ApiResponse. Cần `message` thì dùng axiosClient. */
export const httpGet = async <T>(url: string, params?: object, config?: AxiosRequestConfig) =>
  unwrap(await axiosClient.get<ApiResponse<T>>(url, { ...config, params }));

export const httpPost = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  unwrap(await axiosClient.post<ApiResponse<T>>(url, body, config));

export const httpPut = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  unwrap(await axiosClient.put<ApiResponse<T>>(url, body, config));

export const httpPatch = async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
  unwrap(await axiosClient.patch<ApiResponse<T>>(url, body, config));

export const httpDelete = async <T>(url: string, config?: AxiosRequestConfig) =>
  unwrap(await axiosClient.delete<ApiResponse<T>>(url, config));
