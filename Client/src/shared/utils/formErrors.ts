import type { FormInstance } from 'antd';
import { toApiError } from '@/shared/api/axiosClient';

/**
 * Gắn lỗi validate từ Server (key camelCase trùng tên field) vào đúng ô của Form.
 * Trả về true nếu đã gắn được ít nhất một lỗi theo field.
 */
export const applyServerErrors = (form: FormInstance, error: unknown) => {
  const { errors } = toApiError(error);
  if (!errors) return false;

  const fieldNames = new Set(Object.keys(form.getFieldsValue(true) as Record<string, unknown>));
  const fields = Object.entries(errors)
    .filter(([name]) => fieldNames.has(name))
    .map(([name, messages]) => ({ name, errors: messages }));

  form.setFields(fields);
  return fields.length > 0;
};
