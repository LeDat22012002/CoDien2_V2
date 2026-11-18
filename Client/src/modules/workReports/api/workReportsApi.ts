import {
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  httpPut,
} from "@/shared/api/axiosClient";
import type {
  CreateWorkReportUnitRequest,
  EngineerSuggestion,
  EquipmentOption,
  MaterialPurpose,
  MaterialPurposeRequest,
  MyWorkReportScope,
  PlanItemRequest,
  ReportItemRequest,
  UpdatePlanItemRequest,
  UpdateReportItemRequest,
  UpdateWorkReportSettingRequest,
  UpdateWorkReportUnitRequest,
  UpdateWorkWeekDeadlineRequest,
  WorkCategory,
  WorkCategoryRequest,
  WorkerOption,
  WorkerOptionScope,
  WorkingWeeks,
  WorkGrid,
  WorkMaterial,
  WorkMaterialRequest,
  WorkPlanItem,
  WorkReportFilter,
  WorkReportItem,
  WorkReportPhase,
  WorkReportSetting,
  WorkReportSummary,
  WorkReportUnit,
  WorkReportUnitEngineer,
  WorkReportUnitParentOption,
  WorkWeek,
  MaterialOption,
} from "@/modules/workReports/types/workReports";

// ===== Phạm vi =====

/** Xưởng / tổ-kíp người đăng nhập xem được, kèm quyền từng đơn vị. */
export const getMyWorkReportScope = () =>
  httpGet<MyWorkReportScope>("/work-reports/my-scope");

// ===== Giai đoạn: API kế hoạch /work-reports/plan/*, báo cáo /work-reports/report/* =====

const PHASE_PATH: Record<WorkReportPhase, string> = {
  PLAN: "plan",
  REPORT: "report",
};

/** Tham số lọc gửi Server (phase nằm trong đường dẫn, không gửi). */
const toGridParams = (filter: WorkReportFilter) => ({
  workshopId: filter.workshopId,
  weekId: filter.weekId,
  unitId: filter.unitId,
});

// ===== Trang công khai /work-reports (không cần đăng nhập, chỉ xem mọi xưởng) =====

const PUBLIC_BASE = "/work-reports/public";

export const publicWorkReportsApi = {
  getScope: () => httpGet<MyWorkReportScope>(`${PUBLIC_BASE}/scope`),
  getWeeks: (params: { year?: number; workshopId?: number }) =>
    httpGet<WorkWeek[]>(`${PUBLIC_BASE}/weeks`, params),
  getWorkingWeeks: (workshopId?: number) =>
    httpGet<WorkingWeeks>(`${PUBLIC_BASE}/weeks/current`, { workshopId }),
  getGrid: (filter: WorkReportFilter) =>
    httpGet<WorkGrid>(
      `${PUBLIC_BASE}/${PHASE_PATH[filter.phase]}/grid`,
      toGridParams(filter),
    ),
  getSummary: (filter: WorkReportFilter) =>
    httpGet<WorkReportSummary>(
      `${PUBLIC_BASE}/${PHASE_PATH[filter.phase]}/summary`,
      toGridParams(filter),
    ),
  getWorkshopMaterials: (filter: WorkReportFilter) =>
    httpGet<WorkMaterial[]>(
      `${PUBLIC_BASE}/${PHASE_PATH[filter.phase]}/materials`,
      toGridParams(filter),
    ),
  getFormMaterials: (formId: number, phase: WorkReportPhase) =>
    httpGet<WorkMaterial[]>(
      `${PUBLIC_BASE}/${PHASE_PATH[phase]}/forms/${formId}/materials`,
    ),
};

// ===== Cấu hình chung =====

export const getWorkReportSetting = () =>
  httpGet<WorkReportSetting>("/work-report-settings");

export const updateWorkReportSetting = (
  request: UpdateWorkReportSettingRequest,
) => httpPut<WorkReportSetting>("/work-report-settings", request);

export const getWorkCategories = (params: {
  includeInactive?: boolean;
  workshopId?: number;
}) => httpGet<WorkCategory[]>("/work-categories", params);

export const createWorkCategory = (request: WorkCategoryRequest) =>
  httpPost<WorkCategory>("/work-categories", request);

export const updateWorkCategory = (id: number, request: WorkCategoryRequest) =>
  httpPut<WorkCategory>(`/work-categories/${id}`, request);

export const setWorkCategoryActive = (id: number, isActive: boolean) =>
  httpPatch<WorkCategory>(`/work-categories/${id}/active`, { isActive });

export const getMaterialPurposes = (includeInactive = false) =>
  httpGet<MaterialPurpose[]>("/material-purposes", { includeInactive });

export const createMaterialPurpose = (request: MaterialPurposeRequest) =>
  httpPost<MaterialPurpose>("/material-purposes", request);

export const updateMaterialPurpose = (
  id: number,
  request: MaterialPurposeRequest,
) => httpPut<MaterialPurpose>(`/material-purposes/${id}`, request);

export const setMaterialPurposeActive = (id: number, isActive: boolean) =>
  httpPatch<MaterialPurpose>(`/material-purposes/${id}/active`, { isActive });

// ===== Kỳ tuần =====

export const getWorkWeeks = (params: { year?: number; workshopId?: number }) =>
  httpGet<WorkWeek[]>("/work-weeks", params);

/** Tuần đang nhập báo cáo + tuần đang lập kế hoạch (theo hạn của xưởng). */
export const getWorkingWeeks = (workshopId?: number) =>
  httpGet<WorkingWeeks>("/work-weeks/current", { workshopId });

export const updateWorkWeekDeadline = (
  id: number,
  request: UpdateWorkWeekDeadlineRequest,
) => httpPut<WorkWeek>(`/work-weeks/${id}/deadline`, request);

// ===== Đơn vị báo cáo & kỹ sư =====

export const getWorkReportUnits = (params: {
  workshopId?: number;
  includeInactive?: boolean;
  weekId?: number;
}) => httpGet<WorkReportUnit[]>("/work-report-units", params);

/** Đơn vị đã xóa của xưởng (để khôi phục). */
export const getDeletedWorkReportUnits = (workshopId: number) =>
  httpGet<WorkReportUnit[]>("/work-report-units/deleted", { workshopId });

/** Xưởng và các đội: chỗ gắn đơn vị tự đặt. */
export const getUnitParentOptions = (workshopId: number) =>
  httpGet<WorkReportUnitParentOption[]>("/work-report-units/parent-options", {
    workshopId,
  });

/** Xóa đơn vị chưa có dữ liệu (đã có → 400, chỉ ngừng dùng được). */
export const deleteWorkReportUnit = (id: number) =>
  httpDelete<null>(`/work-report-units/${id}`);

export const restoreWorkReportUnit = (id: number) =>
  httpPost<WorkReportUnit>(`/work-report-units/${id}/restore`);

/** Thêm đơn vị tự đặt. */
export const createWorkReportUnit = (request: CreateWorkReportUnitRequest) =>
  httpPost<WorkReportUnit>("/work-report-units", request);

export const updateWorkReportUnit = (
  id: number,
  request: UpdateWorkReportUnitRequest,
) => httpPut<WorkReportUnit>(`/work-report-units/${id}`, request);

/** orderedIds = toàn bộ Id đơn vị của xưởng theo thứ tự mới. */
export const reorderWorkReportUnits = (
  workshopId: number,
  orderedIds: number[],
) => httpPut<null>("/work-report-units/reorder", { workshopId, orderedIds });

export const getEngineerSuggestions = (unitId: number) =>
  httpGet<EngineerSuggestion[]>(
    `/work-report-units/${unitId}/engineer-suggestions`,
  );

/** Lưu cả danh sách kỹ sư phụ trách. */
export const setUnitEngineers = (unitId: number, employeeIds: number[]) =>
  httpPut<WorkReportUnitEngineer[]>(`/work-report-units/${unitId}/engineers`, {
    employeeIds,
  });

// ===== Lưới, tổng hợp (theo giai đoạn) =====

/** Lưới kế hoạch (WorkPlanGrid) hoặc báo cáo (WorkReportGrid, kèm gợi ý từ kế hoạch cho người nhập). */
export const getWorkGrid = (filter: WorkReportFilter) =>
  httpGet<WorkGrid>(
    `/work-reports/${PHASE_PATH[filter.phase]}/grid`,
    toGridParams(filter),
  );

export const getWorkReportSummary = (filter: WorkReportFilter) =>
  httpGet<WorkReportSummary>(
    `/work-reports/${PHASE_PATH[filter.phase]}/summary`,
    toGridParams(filter),
  );

/** Admin mở khóa giai đoạn đã quá hạn tới until (ISO); until null = khóa lại. */
export const unlockWeeklyForm = (
  phase: WorkReportPhase,
  formId: number,
  until: string | null,
) =>
  httpPost<null>(`/work-reports/${PHASE_PATH[phase]}/forms/${formId}/unlock`, {
    until,
  });

// ===== Dòng kế hoạch =====

export const createPlanItem = (formId: number, request: PlanItemRequest) =>
  httpPost<WorkPlanItem>(`/work-reports/plan/forms/${formId}/items`, request);

/** RowVersion lệch → 409, ApiError.data = dòng mới nhất. */
export const updatePlanItem = (id: number, request: UpdatePlanItemRequest) =>
  httpPut<WorkPlanItem>(`/work-reports/plan/items/${id}`, request);

export const deletePlanItem = (id: number) =>
  httpDelete<null>(`/work-reports/plan/items/${id}`);

// ===== Dòng báo cáo =====

/** Thêm việc phát sinh. */
export const createReportItem = (formId: number, request: ReportItemRequest) =>
  httpPost<WorkReportItem>(
    `/work-reports/report/forms/${formId}/items`,
    request,
  );

/** Đưa dòng kế hoạch (gợi ý) vào báo cáo, giữ mã công việc. */
export const acceptPlanItems = (formId: number, planItemIds: number[]) =>
  httpPost<WorkReportItem[]>(
    `/work-reports/report/forms/${formId}/items/from-plan`,
    { planItemIds },
  );

export const updateReportItem = (
  id: number,
  request: UpdateReportItemRequest,
) => httpPut<WorkReportItem>(`/work-reports/report/items/${id}`, request);

export const deleteReportItem = (id: number) =>
  httpDelete<null>(`/work-reports/report/items/${id}`);

export const getWorkerOptions = (params: {
  unitId: number;
  scope?: WorkerOptionScope;
  keyword?: string;
}) => httpGet<WorkerOption[]>("/work-reports/worker-options", params);

export const getEquipmentOptions = (keyword: string) =>
  httpGet<EquipmentOption[]>("/equipments/options", {
    keyword: keyword || undefined,
  });

/** Gợi ý mã vật tư theo mã hoặc tên (keyword ≥ 2 ký tự, tối đa 20 dòng). */
export const getMaterialOptions = (keyword: string) =>
  httpGet<MaterialOption[]>("/materials/options", {
    keyword: keyword || undefined,
  });

/** Tra đúng mã; null = mã chưa có trong danh mục (vẫn nhập tự do được). */
export const getMaterialByCode = async (code: string) =>
  (await httpGet<MaterialOption | null>("/materials/by-code", { code })) ??
  null;

// ===== Vật tư (theo giai đoạn) =====

export const getFormMaterials = (formId: number, phase: WorkReportPhase) =>
  httpGet<WorkMaterial[]>(
    `/work-reports/${PHASE_PATH[phase]}/forms/${formId}/materials`,
  );

export const getWorkshopMaterials = (filter: WorkReportFilter) =>
  httpGet<WorkMaterial[]>(
    `/work-reports/${PHASE_PATH[filter.phase]}/materials`,
    toGridParams(filter),
  );

export const createWorkMaterial = (
  formId: number,
  phase: WorkReportPhase,
  request: WorkMaterialRequest,
) =>
  httpPost<WorkMaterial>(
    `/work-reports/${PHASE_PATH[phase]}/forms/${formId}/materials`,
    request,
  );

export const updateWorkMaterial = (
  id: number,
  phase: WorkReportPhase,
  request: WorkMaterialRequest,
) =>
  httpPut<WorkMaterial>(
    `/work-reports/${PHASE_PATH[phase]}/materials/${id}`,
    request,
  );

export const deleteWorkMaterial = (id: number, phase: WorkReportPhase) =>
  httpDelete<null>(`/work-reports/${PHASE_PATH[phase]}/materials/${id}`);
