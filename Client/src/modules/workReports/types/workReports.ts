/** Kiểu dữ liệu module Báo cáo công việc tuần, khớp DTO ở Server/Modules/WorkReports/DTOs. */

export type WorkReportPhase = "PLAN" | "REPORT";

/** Kiểu xem Bảng công việc (chỉ ở FE): ALL = mọi tổ/kíp trong 1 bảng; SHEET = mỗi tổ/kíp 1 sheet. */
export type WorkGridLayout = "ALL" | "SHEET";

/** NOT_STARTED: báo cáo chưa tới tuần; OPEN: đang nhập; LOCKED: quá hạn (không ai sửa, chỉ admin mở khóa). */
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

/** Thêm / sửa / xóa dòng (và vật tư) của 1 giai đoạn. */
export interface WorkReportRights {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface WorkReportUnitAccess {
  unitId: number;
  orgUnitId: number;
  displayName: string;
  laborType: LaborType;
  sortOrder: number;
  role: WorkReportRole;
  canView: boolean;
  /** Kỹ sư phụ trách: đủ quyền; người khác: quyền admin cấp (work-reports.plan.*) trong đội/xưởng mình. */
  plan: WorkReportRights;
  report: WorkReportRights;
  /** Mở khóa kế hoạch / báo cáo đã quá hạn (chỉ admin). */
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
  /** Xưởng hiện trên trang công khai; rỗng = mọi xưởng. */
  publicWorkshopIds: number[];
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
  /** Ngày kết thúc phụ trách (chỉ có ở danh sách theo tuần đã khóa); null = đang phụ trách. */
  endDate?: string | null;
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
  /** Đơn vị tự đặt: các tổ trên sơ đồ được gộp (người thực hiện chỉ lấy từ các tổ này). Rỗng = cả đội/xưởng. */
  memberOrgUnits: OrgUnitOption[];
  engineers: WorkReportUnitEngineer[];
  canConfigure: boolean;
  canManageEngineers: boolean;
  /** Bản chụp của tuần đã khóa (xem theo weekId): chỉ xem, không sửa / xóa / phân công. */
  isWeekSnapshot?: boolean;
  weekId?: number | null;
}

/** Chỗ gắn đơn vị tự đặt: xưởng hoặc 1 đội trong xưởng. */
export interface WorkReportUnitParentOption {
  orgUnitId: number;
  name: string;
  isWorkshop: boolean;
  /** Tổ trên sơ đồ nằm trong xưởng / đội này: lựa chọn gộp nhân sự. */
  groups: OrgUnitOption[];
}

/** Đơn vị trên sơ đồ tổ chức. */
export interface OrgUnitOption {
  orgUnitId: number;
  name: string;
}

export interface WorkReportUnitRequestBase {
  displayName?: string | null;
  codePrefix: string;
  laborType: LaborType;
  /** Chỉ đơn vị tự đặt: Id các tổ gộp nhân sự. Rỗng = cả đội/xưởng. */
  memberOrgUnitIds?: number[];
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

/** Phần chung của dòng kế hoạch và dòng báo cáo. */
export interface WorkItemBase {
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
  /** (7) Ngày bắt đầu "YYYY-MM-DD". */
  startDate: string;
  /** (7) Ngày kết thúc; bằng ngày bắt đầu = làm trong 1 ngày. */
  endDate: string;
  workerCount: number;
  workers: WorkItemWorker[];
  /** Cả tổ/kíp: hiển thị "Cả tổ"; workers là danh sách nhân viên tổ/kíp chụp lúc lưu. */
  isWholeUnit: boolean;
  /** "Cả tổ" theo từng tổ (đơn vị có tổ gợi ý): các tổ đã chọn; rỗng = cả đơn vị. */
  wholeGroups: OrgUnitOption[];
  /** (10) KTV phụ trách dòng; rỗng = dòng cũ, hiện KTV của form. */
  engineers: EngineerOption[];
  note?: string | null;
  sortOrder: number;
  rowVersion: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  /** Họ tên người sửa cuối. */
  updatedByName?: string | null;
}

/** 1 KTV (kỹ sư) để hiển thị / chọn ở cột (10). */
export interface EngineerOption {
  employeeId: number;
  fullName: string;
}

// ===== Cập nhật tức thì: ai đang sửa =====

/** 1 người đang sửa / thêm dòng (itemId null = đang thêm dòng mới ở tổ/kíp đó). */
export interface WorkReportEditor {
  connectionId: string;
  userId: number;
  fullName: string;
  formId: number;
  /** Tên tổ/kíp của form đang nhập. */
  unitName: string;
  phase: WorkReportPhase;
  itemId?: number | null;
  since: string;
}

export interface WorkPlanItem extends WorkItemBase {
  plannedMinutes?: number | null;
}

export interface WorkReportItem extends WorkItemBase {
  /** Dòng kế hoạch gốc; null = việc phát sinh. */
  planItemId?: number | null;
  isUnplanned: boolean;
  /** Giờ KH chụp từ dòng kế hoạch. */
  plannedMinutes?: number | null;
  actualMinutes?: number | null;
  effectiveActualMinutes: number;
  diffMinutes: number;
  resultPercent?: number | null;
  workPermit?: string | null;
  fiveS?: string | null;
  explanation?: string | null;
}

/** Phần chung của form tuần 1 tổ/kíp ở lưới kế hoạch / báo cáo. */
export interface WeeklyFormBase {
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
  /** Kỹ sư đang được phân công tổ/kíp: lựa chọn cột (10) khi nhập. */
  engineers: EngineerOption[];
  status: FormPhaseStatus;
  deadlineAt: string;
  planStatus: FormPhaseStatus;
  planDeadlineAt: string;
  reportStatus: FormPhaseStatus;
  reportDeadlineAt: string;
  role: WorkReportRole;
  /** Được thêm / sửa / xóa ngay lúc này (đã tính mở/khóa). */
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canEditNow: boolean;
  /** Admin: mở khóa / khóa lại. */
  canUnlock: boolean;
  /** Quá hạn nhưng đang được admin mở khóa (tới deadlineAt). */
  isUnlocked: boolean;
  itemCount: number;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
}

export interface WeeklyPlanForm extends WeeklyFormBase {
  items: WorkPlanItem[];
}

export interface WeeklyReportForm extends WeeklyFormBase {
  items: WorkReportItem[];
  /** Dòng kế hoạch chưa đưa vào báo cáo (chỉ người đang thêm được dòng báo cáo mới có). */
  suggestions: WorkPlanItem[];
}

interface WorkGridBase<TPhase extends WorkReportPhase, TForm> {
  workshopId: number;
  workshopName: string;
  phase: TPhase;
  title: string;
  week: WorkWeek;
  categories: WorkCategory[];
  forms: TForm[];
}

export type WorkPlanGrid = WorkGridBase<"PLAN", WeeklyPlanForm>;
export type WorkReportGrid = WorkGridBase<"REPORT", WeeklyReportForm>;
/** Lưới của giai đoạn đang xem (phân biệt bằng phase). */
export type WorkGrid = WorkPlanGrid | WorkReportGrid;
export type WeeklyForm = WeeklyPlanForm | WeeklyReportForm;

export interface WorkReportFilter {
  workshopId: number;
  weekId: number;
  /** Chọn API /plan hoặc /report (không gửi lên Server). */
  phase: WorkReportPhase;
  unitId?: number;
}

export interface WorkItemWorkerRequest {
  employeeId?: number | null;
  displayName?: string | null;
}

interface WorkItemRequestBase {
  workCategoryId: number;
  equipmentCode?: string | null;
  equipmentName?: string | null;
  description: string;
  startDate?: string | null;
  /** Trống = bằng ngày bắt đầu. */
  endDate?: string | null;
  workers: WorkItemWorkerRequest[];
  /** Cả tổ/kíp: Server tự lấy nhân viên tổ/kíp, bỏ qua workers. */
  isWholeUnit?: boolean;
  /** Cùng isWholeUnit: "Cả tổ" của các tổ gợi ý này; trống = cả đơn vị. */
  wholeGroupOrgUnitIds?: number[];
  /** (10) KTV phụ trách; trống = người nhập. */
  engineerIds?: number[];
  note?: string | null;
  sortOrder?: number | null;
}

export interface PlanItemRequest extends WorkItemRequestBase {
  plannedMinutes?: number | null;
}

export interface UpdatePlanItemRequest extends PlanItemRequest {
  rowVersion: string;
}

export interface ReportItemRequest extends WorkItemRequestBase {
  /** Giờ KH tự điền: Server chỉ nhận với dòng thêm ở báo cáo (bắt buộc), dòng từ kế hoạch giữ giờ KH. */
  plannedMinutes?: number | null;
  actualMinutes?: number | null;
  resultPercent?: number | null;
  workPermit?: string | null;
  fiveS?: string | null;
  explanation?: string | null;
}

export interface UpdateReportItemRequest extends ReportItemRequest {
  rowVersion: string;
}

export interface WorkerOption {
  employeeId: number;
  empCode: string;
  fullName: string;
  orgUnitName: string;
  levelName: string;
  /** Đơn vị có tổ gợi ý: tổ của người này (chia nhóm theo tổ); null = không chia nhóm. */
  groupOrgUnitId?: number | null;
  groupName?: string | null;
}

export interface EquipmentOption {
  id: number;
  code: string;
  name?: string | null;
}
/** Gợi ý mã vật tư từ danh mục vật tư (GET /materials/options, /materials/by-code). */
export interface MaterialOption {
  id: number;
  code: string;
  /** Tên vật tư. */
  description?: string | null;
  /** Đơn vị tính. */
  uom?: string | null;
  plant?: string | null;
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
  /** Báo cáo: vật tư phát sinh (không chép từ kế hoạch). */
  isUnplanned: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
  /** Họ tên người sửa cuối. */
  updatedByName?: string | null;
  /** Gửi lại khi sửa để phát hiện người khác đã sửa trước (409). */
  rowVersion: string;
}

export interface WorkMaterialRequest {
  /** Bắt buộc khi sửa. */
  rowVersion?: string;
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

// ===== Trang công khai: Hôm nay / Phân tích =====

/** Lưới 1 xưởng trong ngày: chỉ tổ/kíp có việc, mỗi form chỉ dòng trong ngày (số dòng, tổng phút theo ngày). */
export interface DailyWorkshop<TGrid extends WorkGrid> {
  workshopId: number;
  workshopName: string;
  itemCount: number;
  grid: TGrid;
}

/** Lưới từng xưởng công khai, chỉ dòng có khoảng ngày làm phủ ngày date. */
export interface DailyWork<TGrid extends WorkGrid> {
  date: string;
  phase: WorkReportPhase;
  week?: WorkWeek | null;
  workshops: DailyWorkshop<TGrid>[];
}

export interface DashboardCategoryMinutes {
  categoryId: number;
  /** Phút thực tế của đầu mục. */
  minutes: number;
  /** % trong tổng phút thực tế của xưởng. */
  percent: number;
}

/** 1 xưởng trong tuần: kế hoạch từ form kế hoạch, thực tế từ form báo cáo của cùng tuần. */
export interface DashboardWorkshop {
  workshopId: number;
  workshopName: string;
  plannedItemCount: number;
  /** Mọi dòng báo cáo (gồm phát sinh). */
  actualItemCount: number;
  unplannedItemCount: number;
  plannedMaterialCodeCount: number;
  /** Bỏ vật tư có số lượng thực tế = 0. */
  actualMaterialCodeCount: number;
  plannedMinutes: number;
  actualMinutes: number;
  /** Thực tế ÷ kế hoạch × 100; null khi kế hoạch = 0. */
  completionPercent?: number | null;
  categories: DashboardCategoryMinutes[];
}

/** Kế hoạch – thực hiện tuần week theo xưởng công khai. */
export interface WorkReportDashboard {
  week: WorkWeek;
  /** Đầu mục có phút thực tế ở ít nhất 1 xưởng (thứ tự A, B…). */
  categories: WorkCategory[];
  workshops: DashboardWorkshop[];
}
