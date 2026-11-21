import type { OperationStatus } from "@/shared/constants/operationStatus";
import type {
  FormPhaseStatus,
  LaborType,
  WorkReportPhase,
  WorkReportRole,
} from "@/modules/workReports/types/workReports";

export const PHASE_OPTIONS: { value: WorkReportPhase; label: string }[] = [
  { value: "REPORT", label: "Báo cáo tuần" },
  { value: "PLAN", label: "Kế hoạch tuần" },
];

export const PHASE_LABELS: Record<WorkReportPhase, string> = {
  PLAN: "Kế hoạch",
  REPORT: "Báo cáo",
};

/** Trạng thái giai đoạn → màu + icon chung toàn app (StatusTag), kèm chữ riêng. */
export const FORM_STATUS_META: Record<
  FormPhaseStatus,
  { status: OperationStatus; label: string }
> = {
  OPEN: { status: "running", label: "Đang nhập" },
  LOCKED: { status: "stopped", label: "Đã khóa" },
  NOT_STARTED: { status: "warning", label: "Chưa tới tuần" },
};

export const LABOR_TYPE_OPTIONS: { value: LaborType; label: string }[] = [
  { value: "HC", label: "HC – hành chính" },
  { value: "KIP", label: "KIP – theo ca" },
];

/** Người thực hiện là cả tổ/kíp (số người = số nhân viên tổ/kíp trên sơ đồ). */
export const WHOLE_UNIT_LABEL = "Cả tổ";

export const WORK_PERMIT_OPTIONS = [
  { value: "Có GPLV", label: "Có GPLV" },
  { value: "Không cần GPLV", label: "Không cần GPLV" },
  { value: "Chưa có GPLV", label: "Chưa có GPLV" },
];

export const FIVE_S_SUGGESTIONS = [
  { value: "Đã dọn dẹp vệ sinh 5S" },
  { value: "Chưa dọn dẹp vệ sinh 5S" },
];

export const ROLE_LABELS: Record<WorkReportRole, string> = {
  ADMIN: "Quản trị",
  WORKSHOP_MANAGER: "Quản đốc / phó",
  TEAM_MANAGER: "Đội trưởng / phó",
  ENGINEER: "Kỹ sư phụ trách",
  VIEWER: "Chỉ xem",
  NONE: "—",
};
