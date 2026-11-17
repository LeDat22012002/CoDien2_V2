import type { PagedRequest } from "@/shared/types/api";

export interface Material {
  id: number;
  /** Mã vật tư (cột Material). */
  code?: string | null;
  /** Tên vật tư (cột MaterialDescription). */
  description?: string | null;
  basicDataText?: string | null;
  bom?: string | null;
  plant?: string | null;
  materialGroup?: string | null;
  class?: string | null;
  level?: string | null;
  materialLevel?: string | null;
  /** Số tài liệu (cột SoTaiLieu). */
  documentNo?: string | null;
  typeOfSupplies?: string | null;
  /** Đơn vị tính. */
  uom?: string | null;
}

export type MaterialSortBy =
  | "id"
  | "code"
  | "description"
  | "plant"
  | "materialGroup"
  | "typeOfSupplies";

/** Keyword tìm theo mã hoặc tên; các ô lọc còn lại so khớp đúng giá trị. */
export interface MaterialFilter extends PagedRequest {
  plant?: string;
  materialGroup?: string;
  typeOfSupplies?: string;
  materialLevel?: string;
  /** true = chỉ vật tư chưa có đơn vị tính. */
  missingUom?: boolean;
  sortBy?: MaterialSortBy;
  sortDirection?: "asc" | "desc";
}

export interface MaterialLookups {
  plants: string[];
  materialGroups: string[];
  typesOfSupplies: string[];
  materialLevels: string[];
}

export interface MaterialRequest {
  code: string;
  description?: string | null;
  basicDataText?: string | null;
  bom?: string | null;
  plant?: string | null;
  materialGroup?: string | null;
  class?: string | null;
  level?: string | null;
  materialLevel?: string | null;
  documentNo?: string | null;
  typeOfSupplies?: string | null;
  uom?: string | null;
}
