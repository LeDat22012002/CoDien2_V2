import type { AuditLog, AuditLogType } from '@/modules/auditLogs/types/auditLogs';

export const AUDIT_LOG_PAGE_SIZE = 50;
export const AUDIT_LOG_PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

/** Số ngày Server giữ nhật ký (AuditLog:RetentionDays), chỉ để hiển thị mô tả. */
export const AUDIT_LOG_RETENTION_DAYS = 30;

export const AUDIT_LOG_TYPE_LABELS: Record<AuditLogType, string> = {
  LOGIN: 'Đăng nhập',
  PAGE_VIEW: 'Truy cập trang',
  ACTION: 'Thao tác',
};

export const AUDIT_LOG_TYPE_COLORS: Record<AuditLogType, string> = {
  LOGIN: 'purple',
  PAGE_VIEW: 'blue',
  ACTION: 'orange',
};

export const AUDIT_LOG_TYPE_OPTIONS = (Object.keys(AUDIT_LOG_TYPE_LABELS) as AuditLogType[]).map((value) => ({
  label: AUDIT_LOG_TYPE_LABELS[value],
  value,
}));

export const isAuditLogType = (value: string | null): value is AuditLogType =>
  value !== null && value in AUDIT_LOG_TYPE_LABELS;

/** Giá trị trên URL của bộ lọc kết quả. */
export const AUDIT_LOG_STATUS_OPTIONS = [
  { label: 'Thành công', value: 'success' },
  { label: 'Thất bại', value: 'failed' },
];

const METHOD_LABELS: Record<string, string> = {
  POST: 'Thêm / thực hiện',
  PUT: 'Cập nhật',
  PATCH: 'Cập nhật',
  DELETE: 'Xóa',
};

/** Nhóm chức năng theo đoạn đầu đường dẫn API (/api/<module>). */
const API_MODULE_LABELS: Record<string, string> = {
  auth: 'Tài khoản đăng nhập',
  employees: 'Nhân viên',
  users: 'Tài khoản',
  roles: 'Vai trò',
  permissions: 'Phân quyền',
  pages: 'Trang và menu',
  'org-units': 'Cơ cấu tổ chức',
  'position-levels': 'Cấp bậc',
  assignments: 'Vị trí công tác',
  'org-chart': 'Sơ đồ tổ chức',
  'document-templates': 'Danh sách văn bản',
  'issued-documents': 'Sổ văn bản',
  equipments: 'Thiết bị',
  incidents: 'Báo cáo sự cố',
  'audit-logs': 'Nhật ký hệ thống',
};

/** Thao tác cụ thể theo đoạn cuối đường dẫn (khi rõ nghĩa hơn method). */
const ACTION_SEGMENT_LABELS: Record<string, string> = {
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  'change-password': 'Đổi mật khẩu',
  'reset-password': 'Đặt lại mật khẩu',
  import: 'Import Excel',
  'import-default': 'Import Excel',
  avatar: 'Đổi ảnh đại diện',
  progress: 'Cập nhật tiến độ',
  analysis: 'Phân tích',
  supplement: 'Bổ sung số order / biên bản',
  reorder: 'Sắp xếp',
};

/** Tên dễ đọc cho 1 dòng nhật ký: trang đã mở, hoặc "Cập nhật · Báo cáo sự cố". */
export const getAuditLogActionLabel = (log: AuditLog) => {
  if (log.type === 'PAGE_VIEW') return log.pageTitle || log.path;

  const segments = log.path.split('?')[0].split('/').filter(Boolean);
  const moduleLabel = API_MODULE_LABELS[segments[1] ?? ''] ?? segments[1] ?? '';
  const actionLabel =
    ACTION_SEGMENT_LABELS[segments[segments.length - 1] ?? ''] ?? METHOD_LABELS[log.method ?? ''] ?? log.method ?? '';
  return log.type === 'LOGIN' ? actionLabel : [actionLabel, moduleLabel].filter(Boolean).join(' · ');
};
