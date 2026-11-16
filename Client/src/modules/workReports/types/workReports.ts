/** Kiểu dữ liệu module Báo cáo công việc tuần, khớp DTO ở Server/Modules/WorkReports/DTOs. */

export type WorkReportPhase = "PLAN" | "REPORT";

/** Kiểu xem Bảng công việc (chỉ ở FE): ALL = mọi tổ/kíp trong 1 bảng; SHEET = mỗi tổ/kíp 1 sheet. */
export type WorkGridLayout = "ALL" | "SHEET";

/** NOT_STARTED: báo cáo chưa tới tuần; OPEN: đang nhập; LOCKED: quá hạn (chỉ quản đốc/phó sửa). */
export type FormPhaseStatus = "NOT_STARTED" | "OPEN" | "LOCKED";

export type LaborType = "HC" | "KIP";

export type WorkReportRole =
  | "ADMIN"
  | "WORKSHOP_MANAGER"
  | "TEAM_MANAGER"
  | "ENGINEER"
  | "VIEWER"
  | "NONE";

export type WorkerOptionScope = "UNIT" | "TEAM" | "WORKSHOP";

// ===== Phạm vi =====

export interface WorkReportUnitAccess {
  unitId: number;
  orgUnitId: number;
  displayName: string;
  laborType: LaborType;
  sortOrder: number;
  role: WorkReportRole;
  canView: boolean;
  canEdit: boolean;
  canEditLocked: boolean;
  canRequestRevision: boolean;
  canUnlock: boolean;
  canManageEngineers: boolean;
  canConfigure: boolean;
}

export interface WorkReportScopeWorkshop {
  workshopId: number;
  workshopName: string;
  /** Quản đốc/phó của xưởng hoặc admin. */
  isManager: boolean;
  units: WorkReportUnitAccess[];
}

export interface MyWorkReportScope {
  employeeId?: number | null;
  canConfigure: boolean;
  canViewFactory: boolean;
  workshops: WorkReportScopeWorkshop[];
}

// ===== Cấu hình =====

export interface WorkReportSetting {
  hcMinutesPerWeek: number;
  shiftMinutesPerWeek: number;
  deadlineDayOffset: number;
  /** "HH:mm:ss" */
  deadlineTime: string;
  warnDaysBefore: number;
  deadlineDescription: string;
}

export type UpdateWorkReportSettingRequest = Omit<
  WorkReportSetting,
  "deadlineDescription"
>;

export interface WorkCategory {
  id: number;
  code: string;
  groupLetter: string;
  name: string;
  codeSuffix: string;
  sortOrder: number;
  showInSummary: boolean;
  isActive: boolean;
  /** Rỗng = áp dụng mọi xưởng. */
  workshopIds: number[];
}

export interface WorkCategoryRequest {
  code: string;
  groupLetter: string;
  name: string;
  codeSuffix: string;
  sortOrder?: number;
  showInSummary: boolean;
  workshopIds: number[];
}

export interface MaterialPurpose {
  id: number;
  code: string;
  name?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface MaterialPurposeRequest {
  code: string;
  name?: string;
  sortOrder?: number;
}

// ===== Kỳ tuần =====

export interface WorkWeekDeadlineOverride {
  workshopId: number;
  workshopName?: string | null;
  planDeadlineAt?: string | null;
  reportDeadlineAt?: string | null;
}

export interface WorkWeek {
  id: number;
  isoYear: number;
  isoWeek: number;
  startDate: string;
  endDate: string;
  labelMonth: number;
  labelYear: number;
  label: string;
  planDeadlineAt: string;
  reportDeadlineAt: string;
  isDeadlineCustomized: boolean;
  effectivePlanDeadlineAt: string;
  effectiveReportDeadlineAt: string;
  overrides: WorkWeekDeadlineOverride[];
}

export interface WorkingWeeks {
  now: string;
  reportWeek: WorkWeek;
  planWeek: WorkWeek;
}

export interface UpdateWorkWeekDeadlineRequest {
  workshopId?: number;
  planDeadlineAt?: string | null;
  reportDeadlineAt?: string | null;
  resetToDefault?: boolean;
}

// ===== Đơn vị báo cáo & kỹ sư =====

export interface WorkReportUnitEngineer {
  id: number;
  employeeId: number;
  empCode: string;
  fullName: string;
  startDate: string;
}

export interface WorkReportUnit {
  id: number;
  orgUnitId: number;
  orgUnitCode: string;
  orgUnitName: string;
  orgUnitTypeCode: string;
  /** Đơn vị tự đặt (không phải tổ/kíp trên sơ đồ); orgUnitId khi đó là đội / xưởng chứa nó. */
  isCustom: boolean;
  shift?: string | null;
  isOrgUnitActive: boolean;
  teamId?: number | null;
  teamName?: string | null;
  workshopId?: number | null;
  workshopName?: string | null;
  displayName: string;
  codePrefix: string;
  laborType: LaborType;
  sortOrder: number;
  isActive: boolean;
  engineers: WorkReportUnitEngineer[];
  canConfigure: boolean;
  canManageEngineers: boolean;
}

/** Chỗ gắn đơn vị tự đặt: xưởng hoặc 1 đội trong xưởng. */
export interface WorkReportUnitParentOption {
  orgUnitId: number;
  name: string;
  isWorkshop: boolean;
}

export interface WorkReportUnitRequestBase {
  displayName?: string | null;
  codePrefix: string;
  laborType: LaborType;
}

/** Thêm đơn vị tự đặt (tổ/kíp trên sơ đồ Server tự tạo). */
export interface CreateWorkReportUnitRequest extends WorkReportUnitRequestBase {
  parentOrgUnitId: number;
}

export interface UpdateWorkReportUnitRequest extends WorkReportUnitRequestBase {
  isActive: boolean;
}

export interface EngineerSuggestion {
  employeeId: number;
  empCode: string;
  fullName: string;
  orgUnitName: string;
  levelName: string;
  isAssigned: boolean;
}

// ===== Form & dòng công việc =====

export interface WorkItemWorker {
  employeeId?: number | null;
  empCode?: string | null;
  displayName: string;
}

export interface WorkItem {
  id: number;
  weeklyFormId: number;
  tt?: number | null;
  workCategoryId: number;
  categoryCode: string;
  groupLetter: string;
  categoryName: string;
  code: string;
  equipmentId?: number | null;
  equipmentCode?: string | null;
  equipmentName?: string | null;
  description: string;
  workDate: string;
  workerCount: number;
  workers: WorkItemWorker[];
  plannedMinutes?: number | null;
  actualMinutes?: number | null;
  effectiveActualMinutes: number;
  diffMinutes: number;
  resultPercent?: number | null;
  workPermit?: string | null;
  fiveS?: string | null;
  explanation?: string | null;
  note?: string | null;
  isUnplanned: boolean;
  sortOrder: number;
  rowVersion: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface WeeklyForm {
  formId: number;
  unitId: number;
  workWeekId: number;
  workshopId: number;
  orderNo: number;
  orderLabel: string;
  unitName: string;
  codePrefix: string;
  laborType: LaborType;
  capacityMinutes: number;
  engineerNames?: string | null;
  status: FormPhaseStatus;
  deadlineAt: string;
  planStatus: FormPhaseStatus;
  planDeadlineAt: string;
  reportStatus: FormPhaseStatus;
  reportDeadlineAt: string;
  role: WorkReportRole;
  canEditNow: boolean;
  canEditLocked: boolean;
  canRequestRevision: boolean;
  canUnlock: boolean;
  itemCount: number;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  items: WorkItem[];
}

export interface WorkReportGrid {
  workshopId: number;
  workshopName: string;
  phase: WorkReportPhase;
  title: string;
  week: WorkWeek;
  categories: WorkCategory[];
  forms: WeeklyForm[];
}

export interface WorkReportFilter {
  workshopId: number;
  weekId: number;
  phase: WorkReportPhase;
  unitId?: number;
}

export interface WorkItemWorkerRequest {
  employeeId?: number | null;
  displayName?: string | null;
}

export interface WorkItemRequest {
  workCategoryId: number;
  equipmentCode?: string | null;
  equipmentName?: string | null;
  description: string;
  workDate?: string | null;
  workers: WorkItemWorkerRequest[];
  plannedMinutes?: number | null;
  actualMinutes?: number | null;
  resultPercent?: number | null;
  workPermit?: string | null;
  fiveS?: string | null;
  explanation?: string | null;
  note?: string | null;
  sortOrder?: number | null;
}

export interface UpdateWorkItemRequest extends WorkItemRequest {
  rowVersion: string;
}

/** 1 dòng dán từ Excel: mỗi ô là chuỗi thô, Server chuẩn hóa. */
export interface PastedWorkItemRow {
  rowIndex: number;
  category?: string;
  equipmentCode?: string;
  equipmentName?: string;
  description?: string;
  workDate?: string;
  workers?: string;
  plannedMinutes?: string;
  actualMinutes?: string;
  resultPercent?: string;
  workPermit?: string;
  fiveS?: string;
  explanation?: string;
  note?: string;
}

export interface PastedRowError {
  rowIndex: number;
  errors: Record<string, string[]>;
}

export interface BatchCreateWorkItemsResult {
  created: WorkItem[];
  errors: PastedRowError[];
}

export interface WorkerOption {
  employeeId: number;
  empCode: string;
  fullName: string;
  orgUnitName: string;
  levelName: string;
}

export interface EquipmentOption {
  id: number;
  code: string;
  name?: string | null;
}

// ===== Vật tư =====

export interface WorkMaterial {
  id: number;
  weeklyFormId: number;
  unitName: string;
  workItemId: number;
  workItemCode: string;
  workItemDescription?: string | null;
  engineerNames?: string | null;
  materialCode?: string | null;
  materialName: string;
  uom?: string | null;
  plannedQuantity?: number | null;
  actualQuantity?: number | null;
  effectiveActualQuantity?: number | null;
  usageDate?: string | null;
  materialPurposeId?: number | null;
  materialPurposeCode?: string | null;
  note?: string | null;
  isUnplanned: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface WorkMaterialRequest {
  workItemId: number;
  materialCode?: string | null;
  materialName: string;
  uom?: string | null;
  plannedQuantity?: number | null;
  actualQuantity?: number | null;
  usageDate?: string | null;
  materialPurposeId?: number | null;
  note?: string | null;
}

// ===== Tổng hợp =====

export interface WorkReportSummaryRow {
  formId?: number | null;
  unitId?: number | null;
  orderLabel: string;
  unitName: string;
  laborType?: LaborType | null;
  engineerNames?: string | null;
  materialCodeCount: number;
  /** Key = Id đầu mục (JSON object key dạng chuỗi). */
  minutesByCategory: Record<string, number>;
  totalMinutes: number;
  capacityMinutes: number;
  manpower: number;
  itemCount: number;
  status?: FormPhaseStatus | null;
}

export interface WorkReportSummary {
  workshopId: number;
  workshopName: string;
  phase: WorkReportPhase;
  title: string;
  week: WorkWeek;
  columns: WorkCategory[];
  rows: WorkReportSummaryRow[];
  total: WorkReportSummaryRow;
}
