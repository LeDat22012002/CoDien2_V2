import type { ChangeType, OrgUnitTypeCode } from '@/shared/types/organization';

/** Tên ngắn + màu tag theo loại đơn vị. */
export const UNIT_TYPE_META: Record<OrgUnitTypeCode, { label: string; color: string }> = {
  FACTORY: { label: 'Nhà máy', color: 'gold' },
  WORKSHOP: { label: 'Xưởng', color: 'red' },
  TEAM: { label: 'Đội', color: 'orange' },
  SHIFT: { label: 'Ca', color: 'blue' },
  SECTION: { label: 'Bộ phận', color: 'cyan' },
  GROUP: { label: 'Tổ', color: 'magenta' },
};

/** Màu tag theo cấp bậc. */
export const LEVEL_TAG_COLOR: Record<string, string> = {
  GD: 'gold',
  PGD: 'gold',
  QD: 'red',
  PQD: 'volcano',
  DT: 'orange',
  DP: 'orange',
  TK: 'orange',
  KS: 'blue',
  CV: 'geekblue',
  TT: 'magenta',
  NV: 'default',
};

/** Loại thay đổi (EmployeeAssignment.ChangeType). */
export const CHANGE_TYPES: Record<ChangeType, { label: string; color: string }> = {
  INIT: { label: 'Khởi tạo', color: 'default' },
  APPOINT: { label: 'Bổ nhiệm', color: 'blue' },
  PROMOTE: { label: 'Lên cấp', color: 'green' },
  DEMOTE: { label: 'Xuống cấp', color: 'volcano' },
  TRANSFER: { label: 'Điều chuyển', color: 'geekblue' },
  ACTING: { label: 'Giao quyền', color: 'gold' },
};

export const CHANGE_TYPE_OPTIONS = (['APPOINT', 'PROMOTE', 'DEMOTE', 'TRANSFER', 'ACTING'] as const).map((value) => ({
  value,
  label: CHANGE_TYPES[value].label,
}));

/**
 * Cấp bậc được phép theo loại đơn vị, tránh gán nhầm (vd Quản đốc vào 1 Tổ).
 * Cấp trưởng ghi đè của đơn vị (vd Kho = TK) luôn được thêm vào.
 */
export const ALLOWED_LEVELS_BY_TYPE: Record<OrgUnitTypeCode, string[]> = {
  FACTORY: ['GD', 'PGD'],
  WORKSHOP: ['QD', 'PQD', 'KS'],
  TEAM: ['DT', 'DP', 'KS', 'CV', 'NV'],
  SHIFT: ['KS'],
  SECTION: ['TK', 'NV'],
  GROUP: ['TT'],
};
