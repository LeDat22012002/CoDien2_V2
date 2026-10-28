import type { Rule } from 'antd/es/form';

export const USER_PAGE_SIZE = 10;
export const USER_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Bộ lọc trạng thái tài khoản; ALL = không lọc. */
export type UserStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export const DEFAULT_USER_STATUS_FILTER: UserStatusFilter = 'ALL';

export const USER_STATUS_FILTER_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
  { value: 'LOCKED', label: 'Đang bị khóa tạm' },
];

/** Khớp cấu hình Identity:Password ở Server (tối thiểu 8 ký tự, có chữ và số). */
export const PASSWORD_RULES: Rule[] = [
  { required: true, message: 'Nhập mật khẩu' },
  { min: 8, message: 'Tối thiểu 8 ký tự' },
  { max: 128, message: 'Tối đa 128 ký tự' },
  { pattern: /\p{L}/u, message: 'Phải có ít nhất 1 chữ cái' },
  { pattern: /\d/, message: 'Phải có ít nhất 1 chữ số' },
];

/** Ô "Nhập lại mật khẩu" phải trùng ô passwordField. */
export const getConfirmPasswordRules = (passwordField: string): Rule[] => [
  { required: true, message: 'Nhập lại mật khẩu' },
  ({ getFieldValue }) => ({
    validator: (_, value) =>
      !value || getFieldValue(passwordField) === value
        ? Promise.resolve()
        : Promise.reject(new Error('Mật khẩu nhập lại không khớp')),
  }),
];
