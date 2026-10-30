import { httpDelete, httpGet, httpPost, httpPut } from '@/shared/api/axiosClient';
import type { OrgUnit, PositionLevel } from '@/shared/types/organization';
import type {
  CreateOrgUnitRequest,
  ReorderOrgUnitsRequest,
  UpdateOrgUnitRequest,
  UpdatePositionLevelRequest,
} from '@/modules/organization/types/organization';
import type { OrgChartTree } from '@/modules/organization/types/orgChart';

// Danh sách đơn vị, lookups, người trong đơn vị, chức vụ: shared/api/orgStructureApi.ts

// ===== Sơ đồ tổ chức (công khai) =====

/** Toàn bộ cây sơ đồ + số liệu tổng trong 1 lần gọi. */
export const getOrgChart = () => httpGet<OrgChartTree>('/org-chart');

// ===== Đơn vị =====

export const createOrgUnit = (request: CreateOrgUnitRequest) => httpPost<OrgUnit>('/org-units', request);

/** Không đổi được mã + loại; ghi đè toàn bộ các trường còn lại. */
export const updateOrgUnit = (id: number, request: UpdateOrgUnitRequest) =>
  httpPut<OrgUnit>(`/org-units/${id}`, request);

export const reorderOrgUnits = (request: ReorderOrgUnitsRequest) => httpPut<null>('/org-units/reorder', request);

/** Xóa mềm; Server chặn khi còn đơn vị con hoặc còn người giữ vị trí. */
export const deleteOrgUnit = (id: number) => httpDelete<null>(`/org-units/${id}`);

// ===== Cấp bậc =====

/** Sắp theo Rank. */
export const getPositionLevels = () => httpGet<PositionLevel[]>('/position-levels');

export const updatePositionLevel = (code: string, request: UpdatePositionLevelRequest) =>
  httpPut<PositionLevel>(`/position-levels/${encodeURIComponent(code)}`, request);
