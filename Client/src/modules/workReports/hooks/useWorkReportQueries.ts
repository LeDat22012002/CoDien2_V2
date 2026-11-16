import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptPlanItems,
  createMaterialPurpose,
  createPlanItem,
  createReportItem,
  createWorkCategory,
  createWorkMaterial,
  createWorkReportUnit,
  deletePlanItem,
  deleteReportItem,
  deleteWorkReportUnit,
  getDeletedWorkReportUnits,
  getUnitParentOptions,
  restoreWorkReportUnit,
  deleteWorkMaterial,
  getEngineerSuggestions,
  getEquipmentOptions,
  getFormMaterials,
  getMaterialPurposes,
  getMyWorkReportScope,
  getWorkCategories,
  getWorkerOptions,
  getWorkingWeeks,
  getWorkGrid,
  getWorkReportSetting,
  getWorkReportSummary,
  getWorkReportUnits,
  getWorkshopMaterials,
  getWorkWeeks,
  reorderWorkReportUnits,
  setMaterialPurposeActive,
  setUnitEngineers,
  setWorkCategoryActive,
  unlockWeeklyForm,
  updateMaterialPurpose,
  updatePlanItem,
  updateReportItem,
  updateWorkCategory,
  updateWorkMaterial,
  updateWorkReportSetting,
  updateWorkReportUnit,
  updateWorkWeekDeadline,
  publicWorkReportsApi,
} from '@/modules/workReports/api/workReportsApi';
import { useIsPublicWorkReport } from '@/modules/workReports/hooks/workReportViewContext';
import type {
  CreateWorkReportUnitRequest,
  MaterialPurposeRequest,
  PlanItemRequest,
  ReportItemRequest,
  UpdatePlanItemRequest,
  UpdateReportItemRequest,
  UpdateWorkReportUnitRequest,
  UpdateWorkWeekDeadlineRequest,
  WorkCategoryRequest,
  WorkerOptionScope,
  WorkMaterialRequest,
  WorkReportFilter,
  WorkReportPhase,
} from '@/modules/workReports/types/workReports';

/**
 * Mọi key bắt đầu bằng 'workReports'. Nhóm:
 * - config: cấu hình, đầu mục, mục đích (ít đổi)
 * - structure: phạm vi, đơn vị, kỹ sư (đổi đơn vị/kỹ sư → làm mới cả lưới vì form đổi theo)
 * - data: lưới, tổng hợp, vật tư (ghi dòng / vật tư → làm mới nhóm này)
 * Hook đọc dùng được ở trang công khai (WorkReportPublicContext): thêm `isPublic` cuối key để không lẫn cache.
 */
export const WORK_REPORT_QUERY_KEYS = {
  all: ['workReports'] as const,
  scope: ['workReports', 'structure', 'scope'] as const,
  structure: ['workReports', 'structure'] as const,
  units: (workshopId?: number, includeInactive?: boolean) =>
    ['workReports', 'structure', 'units', workshopId, includeInactive] as const,
  deletedUnits: (workshopId?: number) => ['workReports', 'structure', 'deletedUnits', workshopId] as const,
  unitParentOptions: (workshopId?: number) => ['workReports', 'structure', 'unitParentOptions', workshopId] as const,
  engineerSuggestions: (unitId?: number) => ['workReports', 'structure', 'engineerSuggestions', unitId] as const,
  config: ['workReports', 'config'] as const,
  setting: ['workReports', 'config', 'setting'] as const,
  categories: (includeInactive: boolean, workshopId?: number) =>
    ['workReports', 'config', 'categories', includeInactive, workshopId] as const,
  purposes: (includeInactive: boolean) => ['workReports', 'config', 'purposes', includeInactive] as const,
  weeks: (year?: number, workshopId?: number) => ['workReports', 'weeks', year, workshopId] as const,
  workingWeeks: (workshopId?: number) => ['workReports', 'weeks', 'current', workshopId] as const,
  data: ['workReports', 'data'] as const,
  grid: (filter?: WorkReportFilter) => ['workReports', 'data', 'grid', filter] as const,
  summary: (filter?: WorkReportFilter) => ['workReports', 'data', 'summary', filter] as const,
  workshopMaterials: (filter?: WorkReportFilter) => ['workReports', 'data', 'materials', filter] as const,
  formMaterials: (formId?: number, phase?: WorkReportPhase) =>
    ['workReports', 'data', 'formMaterials', formId, phase] as const,
  workerOptions: (unitId?: number, scope?: WorkerOptionScope, keyword?: string) =>
    ['workReports', 'workerOptions', unitId, scope, keyword] as const,
  equipmentOptions: (keyword: string) => ['workReports', 'equipmentOptions', keyword] as const,
};

const useInvalidate = (queryKey: readonly unknown[]) => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey });
};

// ===== Phạm vi, cấu hình =====

export const useMyWorkReportScope = () => {
  const isPublic = useIsPublicWorkReport();
  return useQuery({
    queryKey: [...WORK_REPORT_QUERY_KEYS.scope, isPublic],
    queryFn: isPublic ? publicWorkReportsApi.getScope : getMyWorkReportScope,
    staleTime: 60_000,
  });
};

export const useWorkReportSetting = () =>
  useQuery({ queryKey: WORK_REPORT_QUERY_KEYS.setting, queryFn: getWorkReportSetting });

export const useUpdateWorkReportSetting = () => {
  const invalidate = useInvalidate(WORK_REPORT_QUERY_KEYS.all);
  return useMutation({ mutationFn: updateWorkReportSetting, onSuccess: invalidate });
};

export const useWorkCategories = (includeInactive = false, workshopId?: number) =>
  useQuery({
    queryKey: WORK_REPORT_QUERY_KEYS.categories(includeInactive, workshopId),
    queryFn: () => getWorkCategories({ includeInactive, workshopId }),
  });

export const useSaveWorkCategory = () => {
  const invalidate = useInvalidate(WORK_REPORT_QUERY_KEYS.all);
  return useMutation({
    mutationFn: ({ id, request }: { id?: number; request: WorkCategoryRequest }) =>
      id ? updateWorkCategory(id, request) : createWorkCategory(request),
    onSuccess: invalidate,
  });
};

export const useSetWorkCategoryActive = () => {
  const invalidate = useInvalidate(WORK_REPORT_QUERY_KEYS.all);
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => setWorkCategoryActive(id, isActive),
    onSuccess: invalidate,
  });
};

export const useMaterialPurposes = (includeInactive = false) =>
  useQuery({
    queryKey: WORK_REPORT_QUERY_KEYS.purposes(includeInactive),
    queryFn: () => getMaterialPurposes(includeInactive),
  });

export const useSaveMaterialPurpose = () => {
  const invalidate = useInvalidate(WORK_REPORT_QUERY_KEYS.config);
  return useMutation({
    mutationFn: ({ id, request }: { id?: number; request: MaterialPurposeRequest }) =>
      id ? updateMaterialPurpose(id, request) : createMaterialPurpose(request),
    onSuccess: invalidate,
  });
};

export const useSetMaterialPurposeActive = () => {
  const invalidate = useInvalidate(WORK_REPORT_QUERY_KEYS.config);
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => setMaterialPurposeActive(id, isActive),
    onSuccess: invalidate,
  });
};

// ===== Kỳ tuần =====

export const useWorkWeeks = (year?: number, workshopId?: number) => {
  const isPublic = useIsPublicWorkReport();
  return useQuery({
    queryKey: [...WORK_REPORT_QUERY_KEYS.weeks(year, workshopId), isPublic],
    queryFn: () => (isPublic ? publicWorkReportsApi.getWeeks : getWorkWeeks)({ year, workshopId }),
    placeholderData: keepPreviousData,
  });
};

export const useWorkingWeeks = (workshopId?: number) => {
  const isPublic = useIsPublicWorkReport();
  return useQuery({
    queryKey: [...WORK_REPORT_QUERY_KEYS.workingWeeks(workshopId), isPublic],
    queryFn: () => (isPublic ? publicWorkReportsApi.getWorkingWeeks : getWorkingWeeks)(workshopId),
  });
};

export const useUpdateWorkWeekDeadline = () => {
  const invalidate = useInvalidate(WORK_REPORT_QUERY_KEYS.all);
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateWorkWeekDeadlineRequest }) =>
      updateWorkWeekDeadline(id, request),
    onSuccess: invalidate,
  });
};

// ===== Đơn vị báo cáo & kỹ sư =====

export const useWorkReportUnits = (workshopId?: number, includeInactive = true) =>
  useQuery({
    queryKey: WORK_REPORT_QUERY_KEYS.units(workshopId, includeInactive),
    queryFn: () => getWorkReportUnits({ workshopId, includeInactive }),
    enabled: workshopId !== undefined,
  });

export const useDeletedWorkReportUnits = (workshopId: number | undefined, isEnabled: boolean) =>
  useQuery({
    queryKey: WORK_REPORT_QUERY_KEYS.deletedUnits(workshopId),
    queryFn: () => getDeletedWorkReportUnits(workshopId as number),
    enabled: isEnabled && workshopId !== undefined,
  });

export const useUnitParentOptions = (workshopId: number | undefined, isEnabled: boolean) =>
  useQuery({
    queryKey: WORK_REPORT_QUERY_KEYS.unitParentOptions(workshopId),
    queryFn: () => getUnitParentOptions(workshopId as number),
    enabled: isEnabled && workshopId !== undefined,
    staleTime: 5 * 60_000,
  });

/** Đổi đơn vị / kỹ sư: form của tuần đang chạy đổi theo → làm mới cả module. */
const useInvalidateAll = () => useInvalidate(WORK_REPORT_QUERY_KEYS.all);

export const useCreateWorkReportUnit = () => {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (request: CreateWorkReportUnitRequest) => createWorkReportUnit(request),
    onSuccess: invalidate,
  });
};

export const useUpdateWorkReportUnit = () => {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateWorkReportUnitRequest }) =>
      updateWorkReportUnit(id, request),
    onSuccess: invalidate,
  });
};

export const useDeleteWorkReportUnit = () => {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: number) => deleteWorkReportUnit(id), onSuccess: invalidate });
};

export const useRestoreWorkReportUnit = () => {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: number) => restoreWorkReportUnit(id), onSuccess: invalidate });
};

export const useReorderWorkReportUnits = () => {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ workshopId, orderedIds }: { workshopId: number; orderedIds: number[] }) =>
      reorderWorkReportUnits(workshopId, orderedIds),
    onSuccess: invalidate,
  });
};

export const useEngineerSuggestions = (unitId: number | undefined, isEnabled: boolean) =>
  useQuery({
    queryKey: WORK_REPORT_QUERY_KEYS.engineerSuggestions(unitId),
    queryFn: () => getEngineerSuggestions(unitId as number),
    enabled: isEnabled && unitId !== undefined,
  });

export const useSetUnitEngineers = () => {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ unitId, employeeIds }: { unitId: number; employeeIds: number[] }) =>
      setUnitEngineers(unitId, employeeIds),
    onSuccess: invalidate,
  });
};

// ===== Lưới, tổng hợp, vật tư =====

/** Lưới của giai đoạn trong filter: kế hoạch (WorkPlanGrid) hoặc báo cáo (WorkReportGrid), phân biệt bằng grid.phase. */
export const useWorkGrid = (filter: WorkReportFilter | undefined) => {
  const isPublic = useIsPublicWorkReport();
  return useQuery({
    queryKey: [...WORK_REPORT_QUERY_KEYS.grid(filter), isPublic],
    queryFn: () => (isPublic ? publicWorkReportsApi.getGrid : getWorkGrid)(filter as WorkReportFilter),
    enabled: filter !== undefined,
    placeholderData: keepPreviousData,
  });
};

export const useWorkReportSummary = (filter: WorkReportFilter | undefined) => {
  const isPublic = useIsPublicWorkReport();
  return useQuery({
    queryKey: [...WORK_REPORT_QUERY_KEYS.summary(filter), isPublic],
    queryFn: () => (isPublic ? publicWorkReportsApi.getSummary : getWorkReportSummary)(filter as WorkReportFilter),
    enabled: filter !== undefined,
    placeholderData: keepPreviousData,
  });
};

export const useWorkshopMaterials = (filter: WorkReportFilter | undefined) => {
  const isPublic = useIsPublicWorkReport();
  return useQuery({
    queryKey: [...WORK_REPORT_QUERY_KEYS.workshopMaterials(filter), isPublic],
    queryFn: () =>
      (isPublic ? publicWorkReportsApi.getWorkshopMaterials : getWorkshopMaterials)(filter as WorkReportFilter),
    enabled: filter !== undefined,
    placeholderData: keepPreviousData,
  });
};

export const useFormMaterials = (formId: number | undefined, phase: WorkReportPhase) => {
  const isPublic = useIsPublicWorkReport();
  return useQuery({
    queryKey: [...WORK_REPORT_QUERY_KEYS.formMaterials(formId, phase), isPublic],
    queryFn: () => (isPublic ? publicWorkReportsApi.getFormMaterials : getFormMaterials)(formId as number, phase),
    enabled: formId !== undefined,
  });
};

export const useWorkerOptions = (unitId: number | undefined, scope: WorkerOptionScope, keyword: string) =>
  useQuery({
    queryKey: WORK_REPORT_QUERY_KEYS.workerOptions(unitId, scope, keyword),
    queryFn: () => getWorkerOptions({ unitId: unitId as number, scope, keyword: keyword || undefined }),
    enabled: unitId !== undefined,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

export const useEquipmentOptions = (keyword: string, isEnabled: boolean) =>
  useQuery({
    queryKey: WORK_REPORT_QUERY_KEYS.equipmentOptions(keyword),
    queryFn: () => getEquipmentOptions(keyword),
    enabled: isEnabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

const useInvalidateData = () => useInvalidate(WORK_REPORT_QUERY_KEYS.data);

// ===== Dòng kế hoạch =====

export const useSavePlanItem = () => {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: (
      args:
        | { mode: 'create'; formId: number; request: PlanItemRequest }
        | { mode: 'update'; id: number; request: UpdatePlanItemRequest },
    ) => (args.mode === 'create' ? createPlanItem(args.formId, args.request) : updatePlanItem(args.id, args.request)),
    onSettled: invalidate,
  });
};

export const useDeletePlanItem = () => {
  const invalidate = useInvalidateData();
  return useMutation({ mutationFn: (id: number) => deletePlanItem(id), onSuccess: invalidate });
};

// ===== Dòng báo cáo =====

export const useSaveReportItem = () => {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: (
      args:
        | { mode: 'create'; formId: number; request: ReportItemRequest }
        | { mode: 'update'; id: number; request: UpdateReportItemRequest },
    ) =>
      args.mode === 'create' ? createReportItem(args.formId, args.request) : updateReportItem(args.id, args.request),
    onSettled: invalidate,
  });
};

export const useDeleteReportItem = () => {
  const invalidate = useInvalidateData();
  return useMutation({ mutationFn: (id: number) => deleteReportItem(id), onSuccess: invalidate });
};

/** Đưa dòng kế hoạch (gợi ý) vào báo cáo. */
export const useAcceptPlanItems = () => {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: ({ formId, planItemIds }: { formId: number; planItemIds: number[] }) =>
      acceptPlanItems(formId, planItemIds),
    onSettled: invalidate,
  });
};

/** Admin mở khóa (until ISO) / khóa lại (until null) 1 giai đoạn của form. */
export const useUnlockWeeklyForm = () => {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: ({ phase, formId, until }: { phase: WorkReportPhase; formId: number; until: string | null }) =>
      unlockWeeklyForm(phase, formId, until),
    onSuccess: invalidate,
  });
};

// ===== Vật tư =====

export const useSaveWorkMaterial = () => {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: (
      args:
        | { mode: 'create'; formId: number; phase: WorkReportPhase; request: WorkMaterialRequest }
        | { mode: 'update'; id: number; phase: WorkReportPhase; request: WorkMaterialRequest },
    ) =>
      args.mode === 'create'
        ? createWorkMaterial(args.formId, args.phase, args.request)
        : updateWorkMaterial(args.id, args.phase, args.request),
    onSuccess: invalidate,
  });
};

export const useDeleteWorkMaterial = () => {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: ({ id, phase }: { id: number; phase: WorkReportPhase }) => deleteWorkMaterial(id, phase),
    onSuccess: invalidate,
  });
};
