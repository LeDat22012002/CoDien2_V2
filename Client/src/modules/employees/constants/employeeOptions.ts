import type { EducationLevel, EmployeeStatus, Gender } from '@/modules/employees/types/employees';

export const EMPLOYEE_PAGE_SIZE = 10;
export const EMPLOYEE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Bộ lọc trạng thái: mặc định chỉ hiện người đang làm việc; ALL = không lọc. */
export type EmployeeStatusFilter = EmployeeStatus | 'ALL';
export const DEFAULT_STATUS_FILTER: EmployeeStatusFilter = 'ACTIVE';

export const STATUS_FILTER_OPTIONS: { value: EmployeeStatusFilter; label: string }[] = [
  { value: 'ACTIVE', label: 'Đang làm việc' },
  { value: 'INACTIVE', label: 'Đã nghỉ việc' },
  { value: 'ALL', label: 'Tất cả' },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'Nam', label: 'Nam' },
  { value: 'Nữ', label: 'Nữ' },
];

/** Trình độ hợp lệ (Server kiểm tra theo danh sách này). */
export const EDUCATION_LEVEL_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: 'ĐH', label: 'ĐH' },
  { value: 'CĐ', label: 'CĐ' },
  { value: 'TC', label: 'TC' },
  { value: 'SC', label: 'SC' },
  { value: 'CNKT', label: 'CNKT' },
];
