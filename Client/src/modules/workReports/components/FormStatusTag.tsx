import { StatusTag } from '@/shared/components/StatusTag';
import { FORM_STATUS_META } from '@/modules/workReports/constants/workReportOptions';
import type { FormPhaseStatus } from '@/modules/workReports/types/workReports';

interface FormStatusTagProps {
  status: FormPhaseStatus;
}

/** Trạng thái giai đoạn của form: Đang nhập / Đã khóa / Chưa tới tuần (icon + chữ). */
export const FormStatusTag = ({ status }: FormStatusTagProps) => {
  const meta = FORM_STATUS_META[status];
  return <StatusTag status={meta.status} label={meta.label} />;
};
