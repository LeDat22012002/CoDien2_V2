import type { OperationStatus } from '@/shared/constants/operationStatus';
import type {
  FormPhaseStatus,
  LaborType,
  PastedWorkItemRow,
  WorkerOptionScope,
  WorkReportPhase,
  WorkReportRole,
} from '@/modules/workReports/types/workReports';

export const PHASE_OPTIONS: { value: WorkReportPhase; label: string }[] = [
  { value: 'REPORT', label: 'Báo cáo tuần' },
  { value: 'PLAN', label: 'Kế hoạch tuần' },
];

export const PHASE_LABELS: Record<WorkReportPhase, string> = {
  PLAN: 'Kế hoạch',
  REPORT: 'Báo cáo',
};

/** Trạng thái giai đoạn → màu + icon chung toàn app (StatusTag), kèm chữ riêng. */
export const FORM_STATUS_META: Record<FormPhaseStatus, { status: OperationStatus; label: string }> = {
  OPEN: { status: 'running', label: 'Đang nhập' },
  LOCKED: { status: 'stopped', label: 'Đã khóa' },
  NOT_STARTED: { status: 'warning', label: 'Chưa tới tuần' },
};

export const LABOR_TYPE_OPTIONS: { value: LaborType; label: string }[] = [
  { value: 'HC', label: 'HC – hành chính' },
  { value: 'KIP', label: 'KIP – theo ca' },
];

export const WORKER_SCOPE_OPTIONS: { value: WorkerOptionScope; label: string }[] = [
  { value: 'UNIT', label: 'Tổ/kíp' },
  { value: 'TEAM', label: 'Đội' },
  { value: 'WORKSHOP', label: 'Xưởng' },
];

export const WORK_PERMIT_OPTIONS = [
  { value: 'Có', label: 'Có' },
  { value: 'Không', label: 'Không' },
];

export const FIVE_S_SUGGESTIONS = [{ value: 'Đã dọn dẹp vệ sinh 5S' }];

export const ROLE_LABELS: Record<WorkReportRole, string> = {
  ADMIN: 'Quản trị',
  WORKSHOP_MANAGER: 'Quản đốc / phó',
  TEAM_MANAGER: 'Đội trưởng / phó',
  ENGINEER: 'Kỹ sư phụ trách',
  VIEWER: 'Chỉ xem',
  NONE: '—',
};

/** Ô dán Excel: thứ tự cột đúng như sheet tổ của file Excel cũ (kế hoạch 12 cột, báo cáo 18 cột). Null = bỏ qua. */
type PastedField = Exclude<keyof PastedWorkItemRow, 'rowIndex'>;

export const PASTE_COLUMNS: Record<WorkReportPhase, { label: string; field: PastedField | null }[]> = {
  PLAN: [
    { label: '(1) TT', field: null },
    { label: '(2) Tổ thực hiện', field: null },
    { label: '(3) Công việc thực hiện', field: 'category' },
    { label: '(4) Mã công việc', field: null },
    { label: '(5) Equipment', field: 'equipmentCode' },
    { label: '(6) Hạng mục công việc', field: 'description' },
    { label: '(7) Ngày thực hiện', field: 'workDate' },
    { label: '(8) Số người', field: null },
    { label: '(9) Tên người thực hiện', field: 'workers' },
    { label: '(10) KTV phụ trách', field: null },
    { label: '(11) Giờ công KH (phút)', field: 'plannedMinutes' },
    { label: '(18) Ghi chú', field: 'note' },
  ],
  REPORT: [
    { label: '(1) TT', field: null },
    { label: '(2) Tổ thực hiện', field: null },
    { label: '(3) Công việc thực hiện', field: 'category' },
    { label: '(4) Mã công việc', field: null },
    { label: '(5) Equipment', field: 'equipmentCode' },
    { label: '(6) Hạng mục công việc', field: 'description' },
    { label: '(7) Ngày thực hiện', field: 'workDate' },
    { label: '(8) Số người', field: null },
    { label: '(9) Tên người thực hiện', field: 'workers' },
    { label: '(10) KTV phụ trách', field: null },
    { label: '(11) Giờ công KH', field: null },
    { label: '(12) Giờ công thực tế (phút)', field: 'actualMinutes' },
    { label: '(13) Chênh lệch', field: null },
    { label: '(14) Kết quả %', field: 'resultPercent' },
    { label: '(15) GPLV', field: 'workPermit' },
    { label: '(16) 5S', field: 'fiveS' },
    { label: '(17) Diễn giải', field: 'explanation' },
    { label: '(18) Ghi chú', field: 'note' },
  ],
};

/** Tên cột (key lỗi Server) → nhãn hiển thị khi báo lỗi dòng dán. */
export const WORK_ITEM_FIELD_LABELS: Record<string, string> = {
  category: 'Công việc thực hiện',
  workCategoryId: 'Công việc thực hiện',
  equipmentCode: 'Equipment',
  equipmentName: 'Tên thiết bị',
  description: 'Hạng mục',
  workDate: 'Ngày thực hiện',
  workers: 'Người thực hiện',
  plannedMinutes: 'Giờ công KH',
  actualMinutes: 'Giờ công thực tế',
  resultPercent: 'Kết quả %',
  workPermit: 'GPLV',
  fiveS: '5S',
  explanation: 'Diễn giải',
  note: 'Ghi chú',
};
