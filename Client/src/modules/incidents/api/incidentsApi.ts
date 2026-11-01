import { httpDelete, httpGet, httpPost, httpPut } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type {
  CreateIncidentRequest,
  EquipmentOption,
  Incident,
  IncidentDashboard,
  IncidentDashboardFilter,
  IncidentFilter,
  IncidentScope,
  IncidentWorkshop,
  RepeatedEquipment,
  UpdateIncidentAnalysisRequest,
  UpdateIncidentProgressRequest,
  UpdateIncidentRequest,
  UpdateIncidentSupplementRequest,
} from '@/modules/incidents/types/incidents';

// ===== Báo cáo sự cố =====

/** Danh sách báo cáo (công khai), mới nhận thông tin lên đầu. */
export const getIncidents = (filter: IncidentFilter) => httpGet<PagedResult<Incident>>('/incidents', filter);

/** Người nhập lấy theo tài khoản đăng nhập. */
export const createIncident = (request: CreateIncidentRequest) => httpPost<Incident>('/incidents', request);

/** Sửa đầy đủ (incidents.manage). */
export const updateIncident = (id: number, request: UpdateIncidentRequest) =>
  httpPut<Incident>(`/incidents/${id}`, request);

/** Mốc thời gian, mô tả, phương án (người nhập hoặc quản lý). */
export const updateIncidentProgress = (id: number, request: UpdateIncidentProgressRequest) =>
  httpPut<Incident>(`/incidents/${id}/progress`, request);

/** Số order, link biên bản (người nhập, người phân tích của xưởng hoặc quản lý). */
export const updateIncidentSupplement = (id: number, request: UpdateIncidentSupplementRequest) =>
  httpPut<Incident>(`/incidents/${id}/supplement`, request);

/** Nguyên nhân, nguyên nhân gốc, hành động (phân tích của xưởng hoặc quản lý). */
export const updateIncidentAnalysis = (id: number, request: UpdateIncidentAnalysisRequest) =>
  httpPut<Incident>(`/incidents/${id}/analysis`, request);

export const deleteIncident = (id: number) => httpDelete<null>(`/incidents/${id}`);

/** Quyền quản lý / phân tích và xưởng của người đang đăng nhập. */
export const getMyIncidentScope = () => httpGet<IncidentScope>('/incidents/my-scope');

// ===== Dashboard (công khai) =====

/** Toàn nhà máy (kèm thống kê theo xưởng) hoặc 1 xưởng. */
export const getIncidentDashboard = (filter: IncidentDashboardFilter) =>
  httpGet<IncidentDashboard>('/incidents/dashboard', filter);

/** Thiết bị có số sự cố trong năm vượt ngưỡng lặp lại. */
export const getRepeatedEquipment = (filter: IncidentDashboardFilter) =>
  httpGet<RepeatedEquipment[]>('/incidents/repeated-equipment', filter);

// ===== Danh mục =====

/** Xưởng đang hoạt động (công khai). */
export const getIncidentWorkshops = () => httpGet<IncidentWorkshop[]>('/incidents/workshops');

/** Tìm thiết bị theo mã / tên, tối đa 50 dòng (cần đăng nhập). */
export const getEquipmentOptions = (keyword: string) =>
  httpGet<EquipmentOption[]>('/equipments/options', { keyword: keyword || undefined });
