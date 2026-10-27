import type { DisplayMode, OrgUnitTypeCode } from '@/shared/types/organization';

// Kiểu dữ liệu đọc (OrgUnit, PositionLevel, lookups…) dùng chung ở shared/types/organization.ts

/** Các trường sửa được của đơn vị. PUT ghi đè toàn bộ nên luôn gửi đủ. */
export interface OrgUnitRequestBase {
  name: string;
  shortName?: string;
  parentId?: number | null;
  /** Để trống = theo loại đơn vị. */
  headLevelCode?: string;
  disciplineCode?: string;
  area?: string;
  shift?: string;
  sortOrder: number;
  note?: string;
}

export interface CreateOrgUnitRequest extends OrgUnitRequestBase {
  code: string;
  typeCode: OrgUnitTypeCode;
}

export type UpdateOrgUnitRequest = OrgUnitRequestBase;

/** OrderedIds phải gồm đủ các đơn vị con đang hoạt động theo thứ tự mới. */
export interface ReorderOrgUnitsRequest {
  parentId: number;
  orderedIds: number[];
}

/** Không đổi được mã cấp bậc. GD luôn hàng 1, PGD luôn hàng 2 (Server chặn). */
export interface UpdatePositionLevelRequest {
  name: string;
  rank: number;
  chartRow: number;
  displayMode: DisplayMode;
  blockLabel?: string;
}
