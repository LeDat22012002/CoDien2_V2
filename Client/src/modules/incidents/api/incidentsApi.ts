import { httpGet, httpPost } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type {
  CreateIncidentRequest,
  EquipmentOption,
  Incident,
  IncidentFilter,
  IncidentWorkshop,
} from '@/modules/incidents/types/incidents';

// ===== Báo cáo sự cố =====

/** Danh sách báo cáo (công khai), mới nhận thông tin lên đầu. */
export const getIncidents = (filter: IncidentFilter) => httpGet<PagedResult<Incident>>('/incidents', filter);

/** Người nhập lấy theo tài khoản đăng nhập. */
export const createIncident = (request: CreateIncidentRequest) => httpPost<Incident>('/incidents', request);

// ===== Danh mục =====

/** Xưởng đang hoạt động (công khai). */
export const getIncidentWorkshops = () => httpGet<IncidentWorkshop[]>('/incidents/workshops');

/** Tìm thiết bị theo mã / tên, tối đa 50 dòng (cần đăng nhập). */
export const getEquipmentOptions = (keyword: string) =>
  httpGet<EquipmentOption[]>('/equipments/options', { keyword: keyword || undefined });
