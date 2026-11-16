import { formatDate } from '@/shared/utils/format';
import type { WorkItemWorker, WorkItemWorkerRequest } from '@/modules/workReports/types/workReports';

export const EMPLOYEE_PREFIX = 'e:';

/** Giá trị trong ô chọn người thực hiện: "e:<Id>" = nhân viên, chuỗi khác = tên gõ tự do. */
export const toWorkerValue = (worker: WorkItemWorker) =>
  worker.employeeId ? `${EMPLOYEE_PREFIX}${worker.employeeId}` : worker.displayName;

export const fromWorkerValue = (value: string): WorkItemWorkerRequest =>
  value.startsWith(EMPLOYEE_PREFIX) && Number(value.slice(EMPLOYEE_PREFIX.length)) > 0
    ? { employeeId: Number(value.slice(EMPLOYEE_PREFIX.length)) }
    : { displayName: value.trim() };

const HOURS_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(h|g|giờ|gio)$/i;
const MINUTES_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(p|ph|phút|phut|')?$/i;

/**
 * Ô giờ công: số = phút; "8h" / "1,5h" = số người × giờ × 60 (giống quy ước file Excel).
 * Trả null khi ô trống, undefined khi không đọc được.
 */
export const parseMinutesInput = (raw: string | number | null | undefined, workerCount: number) => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const text = raw.trim();
  if (text === '') return null;

  const hours = HOURS_PATTERN.exec(text);
  if (hours) return Math.round(Number(hours[1].replace(',', '.')) * 60 * Math.max(1, workerCount) * 100) / 100;

  const minutes = MINUTES_PATTERN.exec(text);
  if (minutes) return Number(minutes[1].replace(',', '.'));

  return undefined;
};

/** Thời gian thực hiện: cùng ngày → "dd/MM/yyyy"; khác ngày → "dd/MM – dd/MM/yyyy" (khác năm thì ghi đủ năm cả 2). */
export const formatDateRange = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate) return formatDate(startDate);
  if (!endDate || endDate === startDate) return formatDate(startDate);
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const start = formatDate(startDate);
  return `${sameYear ? start.slice(0, 5) : start} – ${formatDate(endDate)}`;
};
