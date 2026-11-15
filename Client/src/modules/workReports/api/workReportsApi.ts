import { httpDelete, httpGet, httpPatch, httpPost, httpPut } from '@/shared/api/axiosClient';
import type {
  BatchCreateWorkItemsResult,
  CreateWorkReportUnitRequest,
  EngineerSuggestion,
  EquipmentOption,
  MaterialPurpose,
  MaterialPurposeRequest,
  MyWorkReportScope,
  PastedWorkItemRow,
  UpdateWorkItemRequest,
  UpdateWorkReportSettingRequest,
  UpdateWorkReportUnitRequest,
  UpdateWorkWeekDeadlineRequest,
  WorkCategory,
  WorkCategoryRequest,
  WorkerOption,
  WorkerOptionScope,
  WorkingWeeks,
  WorkItem,
  WorkItemRequest,
  WorkMaterial,
  WorkMaterialRequest,
  WorkReportFilter,
  WorkReportGrid,
  WorkReportPhase,
  WorkReportSetting,
  WorkReportSummary,
  WorkReportUnit,
  WorkReportUnitEngineer,
  WorkReportUnitParentOption,
  WorkWeek,
} from '@/modules/workReports/types/workReports';

// ===== Phạm vi =====

/** Xưởng / tổ-kíp người đăng nhập xem được, kèm quyền từng đơn vị. */
export const getMyWorkReportScope = () => httpGet<MyWorkReportScope>('/work-reports/my-scope');

// ===== Trang công khai /work-reports (không cần đăng nhập, chỉ xem mọi xưởng) =====

const PUBLIC_BASE = '/work-reports/public';

export const publicWorkReportsApi = {
  getScope: () => httpGet<MyWorkReportScope>(`${PUBLIC_BASE}/scope`),
  getWeeks: (params: { year?: number; workshopId?: number }) => httpGet<WorkWeek[]>(`${PUBLIC_BASE}/weeks`, params),
  getWorkingWeeks: (workshopId?: number) => httpGet<WorkingWeeks>(`${PUBLIC_BASE}/weeks/current`, { workshopId }),
  getGrid: (filter: WorkReportFilter) => httpGet<WorkReportGrid>(`${PUBLIC_BASE}/grid`, filter),
  getSummary: (filter: WorkReportFilter) => httpGet<WorkReportSummary>(`${PUBLIC_BASE}/summary`, filter),
  getWorkshopMaterials: (filter: WorkReportFilter) => httpGet<WorkMaterial[]>(`${PUBLIC_BASE}/materials`, filter),
  getFormMaterials: (formId: number, phase: WorkReportPhase) =>
    httpGet<WorkMaterial[]>(`${PUBLIC_BASE}/forms/${formId}/materials`, { phase }),
};

// ===== Cấu hình chung =====

export const getWorkReportSetting = () => httpGet<WorkReportSetting>('/work-report-settings');

export const updateWorkReportSetting = (request: UpdateWorkReportSettingRequest) =>
  httpPut<WorkReportSetting>('/work-report-settings', request);

export const getWorkCategories = (params: { includeInactive?: boolean; workshopId?: number }) =>
  httpGet<WorkCategory[]>('/work-categories', params);

export const createWorkCategory = (request: WorkCategoryRequest) => httpPost<WorkCategory>('/work-categories', request);

export const updateWorkCategory = (id: number, request: WorkCategoryRequest) =>
  httpPut<WorkCategory>(`/work-categories/${id}`, request);

export const setWorkCategoryActive = (id: number, isActive: boolean) =>
  httpPatch<WorkCategory>(`/work-categories/${id}/active`, { isActive });

export const getMaterialPurposes = (includeInactive = false) =>
  httpGet<MaterialPurpose[]>('/material-purposes', { includeInactive });

export const createMaterialPurpose = (request: MaterialPurposeRequest) =>
  httpPost<MaterialPurpose>('/material-purposes', request);

export const updateMaterialPurpose = (id: number, request: MaterialPurposeRequest) =>
  httpPut<MaterialPurpose>(`/material-purposes/${id}`, request);

export const setMaterialPurposeActive = (id: number, isActive: boolean) =>
  httpPatch<MaterialPurpose>(`/material-purposes/${id}/active`, { isActive });

// ===== Kỳ tuần =====

export const getWorkWeeks = (params: { year?: number; workshopId?: number }) =>
  httpGet<WorkWeek[]>('/work-weeks', params);

/** Tuần đang nhập báo cáo + tuần đang lập kế hoạch (theo hạn của xưởng). */
export const getWorkingWeeks = (workshopId?: number) => httpGet<WorkingWeeks>('/work-weeks/current', { workshopId });

export const updateWorkWeekDeadline = (id: number, request: UpdateWorkWeekDeadlineRequest) =>
  httpPut<WorkWeek>(`/work-weeks/${id}/deadline`, request);

// ===== Đơn vị báo cáo & kỹ sư =====

export const getWorkReportUnits = (params: { workshopId?: number; includeInactive?: boolean }) =>
  httpGet<WorkReportUnit[]>('/work-report-units', params);

/** Đơn vị đã xóa của xưởng (để khôi phục). */
export const getDeletedWorkReportUnits = (workshopId: number) =>
  httpGet<WorkReportUnit[]>('/work-report-units/deleted', { workshopId });

/** Xưởng và các đội: chỗ gắn đơn vị tự đặt. */
export const getUnitParentOptions = (workshopId: number) =>
  httpGet<WorkReportUnitParentOption[]>('/work-report-units/parent-options', { workshopId });

/** Xóa đơn vị chưa có dữ liệu (đã có → 400, chỉ ngừng dùng được). */
export const deleteWorkReportUnit = (id: number) => httpDelete<null>(`/work-report-units/${id}`);

export const restoreWorkReportUnit = (id: number) => httpPost<WorkReportUnit>(`/work-report-units/${id}/restore`);

/** Thêm đơn vị tự đặt. */
export const createWorkReportUnit = (request: CreateWorkReportUnitRequest) =>
  httpPost<WorkReportUnit>('/work-report-units', request);

export const updateWorkReportUnit = (id: number, request: UpdateWorkReportUnitRequest) =>
  httpPut<WorkReportUnit>(`/work-report-units/${id}`, request);

/** orderedIds = toàn bộ Id đơn vị của xưởng theo thứ tự mới. */
export const reorderWorkReportUnits = (workshopId: number, orderedIds: number[]) =>
  httpPut<null>('/work-report-units/reorder', { workshopId, orderedIds });

export const getEngineerSuggestions = (unitId: number) =>
  httpGet<EngineerSuggestion[]>(`/work-report-units/${unitId}/engineer-suggestions`);

/** Lưu cả danh sách kỹ sư phụ trách. */
export const setUnitEngineers = (unitId: number, employeeIds: number[]) =>
  httpPut<WorkReportUnitEngineer[]>(`/work-report-units/${unitId}/engineers`, { employeeIds });

// ===== Lưới, dòng công việc =====

export const getWorkReportGrid = (filter: WorkReportFilter) => httpGet<WorkReportGrid>('/work-reports/grid', filter);

export const getWorkReportSummary = (filter: WorkReportFilter) =>
  httpGet<WorkReportSummary>('/work-reports/summary', filter);

export const createWorkItem = (formId: number, phase: WorkReportPhase, request: WorkItemRequest) =>
  httpPost<WorkItem>(`/work-reports/forms/${formId}/items`, request, { params: { phase } });

/** RowVersion lệch → 409, ApiError.data = dòng mới nhất. */
export const updateWorkItem = (id: number, phase: WorkReportPhase, request: UpdateWorkItemRequest) =>
  httpPut<WorkItem>(`/work-reports/items/${id}`, request, { params: { phase } });

export const deleteWorkItem = (id: number, phase: WorkReportPhase) =>
  httpDelete<null>(`/work-reports/items/${id}`, { params: { phase } });

export const batchCreateWorkItems = (formId: number, phase: WorkReportPhase, rows: PastedWorkItemRow[]) =>
  httpPost<BatchCreateWorkItemsResult>(`/work-reports/forms/${formId}/items/batch`, { rows }, { params: { phase } });

export const getWorkerOptions = (params: { unitId: number; scope?: WorkerOptionScope; keyword?: string }) =>
  httpGet<WorkerOption[]>('/work-reports/worker-options', params);

export const getEquipmentOptions = (keyword: string) =>
  httpGet<EquipmentOption[]>('/equipments/options', { keyword: keyword || undefined });

// ===== Vật tư =====

export const getFormMaterials = (formId: number, phase: WorkReportPhase) =>
  httpGet<WorkMaterial[]>(`/work-reports/forms/${formId}/materials`, { phase });

export const getWorkshopMaterials = (filter: WorkReportFilter) =>
  httpGet<WorkMaterial[]>('/work-reports/materials', filter);

export const createWorkMaterial = (formId: number, phase: WorkReportPhase, request: WorkMaterialRequest) =>
  httpPost<WorkMaterial>(`/work-reports/forms/${formId}/materials`, request, { params: { phase } });

export const updateWorkMaterial = (id: number, phase: WorkReportPhase, request: WorkMaterialRequest) =>
  httpPut<WorkMaterial>(`/work-reports/materials/${id}`, request, { params: { phase } });

export const deleteWorkMaterial = (id: number, phase: WorkReportPhase) =>
  httpDelete<null>(`/work-reports/materials/${id}`, { params: { phase } });
