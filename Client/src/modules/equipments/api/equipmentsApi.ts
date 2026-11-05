import { httpDelete, httpGet, httpPost, httpPut } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type {
  Equipment,
  EquipmentFilter,
  EquipmentImportResult,
  EquipmentImportSheetConfig,
  EquipmentRequest,
} from '@/modules/equipments/types/equipments';

export const getEquipments = (filter: EquipmentFilter) => httpGet<PagedResult<Equipment>>('/equipments', filter);

export const createEquipment = (request: EquipmentRequest) => httpPost<Equipment>('/equipments', request);

export const updateEquipment = (id: number, request: EquipmentRequest) =>
  httpPut<Equipment>(`/equipments/${id}`, request);

/** Thiết bị đã có báo cáo sự cố thì Server từ chối xóa. */
export const deleteEquipment = (id: number) => httpDelete<null>(`/equipments/${id}`);

/** Import theo cấu hình sheet tự khai báo; mã đã có hoặc lặp trong file được bỏ qua. */
export const importEquipments = (file: File, configs: EquipmentImportSheetConfig[]) => {
  const body = new FormData();
  body.append('file', file);
  body.append('configs', JSON.stringify(configs));
  return httpPost<EquipmentImportResult>('/equipments/import', body);
};

/** Import file danh mục gốc (4 sheet "THAM CHIẾU EQ - …" cố định ở Server). */
export const importDefaultEquipments = (file: File) => {
  const body = new FormData();
  body.append('file', file);
  return httpPost<EquipmentImportResult>('/equipments/import-default', body);
};
