/**
 * File tải lên (ảnh đại diện…) Server trả đường dẫn tương đối "/api/uploads/...".
 * Deploy Client và Server khác cổng (VITE_API_BASE_URL = "http://IP:port/api") thì phải ghép địa chỉ Server,
 * nếu không trình duyệt tìm ảnh ở cổng của Client. Dev / cùng origin ("/api") thì giữ nguyên.
 */
const API_ORIGIN = (() => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl || !/^https?:\/\//i.test(apiBaseUrl)) return '';
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return '';
  }
})();

export const toFileUrl = (url: string | null | undefined) => {
  if (!url) return undefined;
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
};
