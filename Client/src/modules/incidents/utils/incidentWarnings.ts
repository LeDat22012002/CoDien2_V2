import dayjs from '@/shared/utils/dayjs';
import {
  ANALYSIS_DUE_DAYS,
  REPORT_REQUIRED_DOWNTIME_MINUTES,
  SUPPLEMENT_DUE_DAYS,
} from '@/modules/incidents/constants/incidentOptions';
import type { Incident } from '@/modules/incidents/types/incidents';

/** Số ngày (phần nguyên) từ khi nhập; null với dữ liệu import Excel (không có thời điểm nhập). */
const getDaysSinceReported = (incident: Incident) =>
  incident.reportedAt ? dayjs().diff(dayjs(incident.reportedAt), 'day') : null;

const isBlank = (value?: string | null) => !value?.trim();

/** Các trường bổ sung còn thiếu khi sự cố ảnh hưởng sản xuất đã quá hạn bổ sung. */
const getMissingSupplements = (incident: Incident) => {
  if (!incident.affectsProduction) return [];

  const days = getDaysSinceReported(incident);
  if (days === null || days <= SUPPLEMENT_DUE_DAYS) return [];

  const missing: string[] = [];
  if (isBlank(incident.orderNumber)) missing.push('Số order');

  const isReportRequired = (incident.downtimeMinutes ?? 0) > REPORT_REQUIRED_DOWNTIME_MINUTES;
  if (isReportRequired && isBlank(incident.reportLink)) missing.push('Link biên bản sự cố');

  return missing;
};

const isAnalysisOverdue = (incident: Incident) => {
  const days = getDaysSinceReported(incident);
  if (days === null || days <= ANALYSIS_DUE_DAYS) return false;
  return isBlank(incident.cause) || isBlank(incident.rootCause) || isBlank(incident.correctiveAction);
};

/** Cảnh báo quá hạn của 1 báo cáo (như hệ thống cũ); rỗng = bình thường. */
export const getIncidentWarnings = (incident: Incident) => {
  const warnings: string[] = [];

  const missingSupplements = getMissingSupplements(incident);
  if (missingSupplements.length > 0) {
    warnings.push(`Quá ${SUPPLEMENT_DUE_DAYS} ngày chưa nhập ${missingSupplements.join(', ')}`);
  }

  if (isAnalysisOverdue(incident)) {
    warnings.push(
      `Quá ${ANALYSIS_DUE_DAYS} ngày chưa nhập Nguyên nhân, Nguyên nhân gốc sau phân tích, Hành động khắc phục`,
    );
  }

  return warnings;
};
