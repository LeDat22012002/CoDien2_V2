import type { DisplayMode, UnitRole } from '@/shared/types/organization';

// ===== Cơ cấu tổ chức =====

export const SHIFT_OPTIONS = ['A', 'B', 'C', 'D'].map((value) => ({ value, label: `Kíp ${value}` }));

export const UNIT_ROLE_META: Record<UnitRole, { label: string; color: string }> = {
  HEAD: { label: 'Trưởng', color: 'red' },
  DEPUTY: { label: 'Phó', color: 'orange' },
  MEMBER: { label: 'Thành viên', color: 'default' },
};

/** Loại đơn vị có chuyên môn (Cơ khí / Điện…). */
export const DISCIPLINE_UNIT_TYPES = ['TEAM', 'GROUP', 'SHIFT'];

// ===== Cấp bậc =====

export const CHART_ROWS = [1, 2, 3, 4, 5, 6] as const;

export const CHART_ROW_OPTIONS = CHART_ROWS.map((row) => ({ value: row, label: `Hàng ${row}` }));

/** Hàng cố định của Ban Giám đốc (Server cũng chặn). */
export const FIXED_CHART_ROWS: Record<string, number> = { GD: 1, PGD: 2 };

/** Gợi ý nội dung từng hàng trên sơ đồ. */
export const CHART_ROW_HINT: Record<number, string> = {
  1: 'Giám đốc',
  2: 'Phó Giám đốc',
  3: 'Xưởng',
  4: 'Đội / Bộ phận',
  5: 'Kỹ sư / Chuyên viên',
  6: 'Tổ / Nhân viên',
};

export const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: 'CARD', label: 'Ô riêng (CARD)' },
  { value: 'BLOCK', label: 'Gộp khối (BLOCK)' },
];
