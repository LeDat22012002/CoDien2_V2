export const REDIRECT_PARAM = 'redirect';

/** Chỉ chấp nhận đường dẫn nội bộ ("/abc"), chặn chuyển hướng ra ngoài ("//evil.com", "https://..."). */
export const getSafeRedirect = (value: string | null | undefined, fallback = '/') =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;

export const buildLoginPath = (redirectTo: string) =>
  redirectTo && redirectTo !== '/' ? `/login?${REDIRECT_PARAM}=${encodeURIComponent(redirectTo)}` : '/login';
