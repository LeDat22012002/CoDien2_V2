import { getAccessToken } from "@/shared/api/axiosClient";
import type { WorkReportPhase } from "@/modules/workReports/types/workReports";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

export interface WorkReportExportParams {
  workshopId: number;
  weekId: number;
  phase: WorkReportPhase;
}

/** Tên file từ Content-Disposition (ưu tiên filename*=UTF-8'' của ASP.NET để giữ tiếng Việt). */
const fileNameOf = (disposition: string | null, fallback: string) => {
  if (!disposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8) return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ""));
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : fallback;
};

/** Thông báo lỗi từ Server (ApiResponse JSON) hoặc theo mã HTTP. */
const errorMessageOf = async (response: Response) => {
  try {
    const body = (await response.json()) as { message?: string };
    if (body?.message) return body.message;
  } catch {
    // không phải JSON
  }
  if (response.status === 401)
    return "Phiên đăng nhập đã hết hạn. Hãy tải lại trang rồi thử lại.";
  if (response.status === 403) return "Bạn không có quyền xuất Excel.";
  return "Xuất Excel không thành công. Hãy thử lại.";
};

/**
 * Xuất Excel kế hoạch / báo cáo tuần của xưởng (GET /work-reports/export, quyền work-reports.export) rồi tải file về.
 * Dùng fetch thay cho httpGet vì nhận file nhị phân, không phải JSON.
 */
export const downloadWorkReportExcel = async ({
  workshopId,
  weekId,
  phase,
}: WorkReportExportParams) => {
  const query = new URLSearchParams({
    workshopId: String(workshopId),
    weekId: String(weekId),
    phase,
  });
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}/work-reports/export?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(await errorMessageOf(response));

  const blob = await response.blob();
  const fileName = fileNameOf(
    response.headers.get("Content-Disposition"),
    phase === "PLAN" ? "Ke-hoach-cong-viec.xlsx" : "Bao-cao-cong-viec.xlsx",
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
