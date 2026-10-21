import type { Dayjs } from 'dayjs';
import dayjs from '@/shared/utils/dayjs';

export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
/** Định dạng ngày gửi lên Server (ISO 8601, không kèm giờ). */
export const ISO_DATE_FORMAT = 'YYYY-MM-DD';
export const EMPTY_TEXT = '—';

type DateInput = string | number | Date | Dayjs | null | undefined;

const integerFormatter = new Intl.NumberFormat('vi-VN');

const toValidDayjs = (value: DateInput) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

export const formatDate = (value: DateInput) => toValidDayjs(value)?.format(DATE_FORMAT) ?? EMPTY_TEXT;

export const formatDateTime = (value: DateInput) => toValidDayjs(value)?.format(DATE_TIME_FORMAT) ?? EMPTY_TEXT;

/** Số kiểu Việt Nam: 1.234.567,89 */
export const formatNumber = (value: number | null | undefined, maximumFractionDigits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  if (maximumFractionDigits === 0) return integerFormatter.format(value);
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits }).format(value);
};

/** Giá trị DatePicker → chuỗi ngày ISO để gửi API. */
export const toIsoDate = (value: Dayjs | null | undefined) => (value ? value.format(ISO_DATE_FORMAT) : undefined);
