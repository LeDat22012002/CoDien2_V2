import {
  httpDelete,
  httpGet,
  httpPost,
  httpPut,
} from "@/shared/api/axiosClient";
import type { PagedResult } from "@/shared/types/api";
import type {
  Material,
  MaterialFilter,
  MaterialLookups,
  MaterialRequest,
} from "@/modules/materials/types/materials";

export const getMaterials = (filter: MaterialFilter) =>
  httpGet<PagedResult<Material>>("/materials", filter);

/** Giá trị có sẵn cho các ô lọc (Plant, nhóm, loại, cấp vật tư). */
export const getMaterialLookups = () =>
  httpGet<MaterialLookups>("/materials/lookups");

export const createMaterial = (request: MaterialRequest) =>
  httpPost<Material>("/materials", request);

export const updateMaterial = (id: number, request: MaterialRequest) =>
  httpPut<Material>(`/materials/${id}`, request);

export const deleteMaterial = (id: number) =>
  httpDelete<null>(`/materials/${id}`);
