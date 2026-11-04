import type { PagedRequest } from '@/shared/types/api';

export interface Equipment {
  id: number;
  code: string;
  name?: string | null;
}

/** Keyword tìm theo mã hoặc tên. */
export type EquipmentFilter = PagedRequest;

export interface EquipmentRequest {
  code: string;
  name?: string;
}

/** Cấu hình đọc 1 sheet khi import; cột đánh số từ 1 (A = 1). */
export interface EquipmentImportSheetConfig {
  sheetName: string;
  startRow: number;
  codeColumn: number;
  nameColumn: number;
}

export interface EquipmentImportResult {
  totalRows: number;
  insertedCount: number;
  /** Mã đã có trong danh mục hoặc lặp lại trong file. */
  skippedCount: number;
  errors: string[];
}
