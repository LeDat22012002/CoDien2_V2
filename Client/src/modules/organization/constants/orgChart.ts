import type { ChartBoxStyle } from '@/modules/organization/types/orgChart';

/**
 * Cấu hình hiển thị trang Sơ đồ tổ chức: màu và bố cục theo bản vẽ BM.01-QT.04.
 * Màu ô là màu của bản vẽ gốc (nhận diện theo cấp), không lấy từ theme.
 */

/** Màu ô theo cấp (giống bản vẽ Visio). */
export const BOX_STYLE = {
  BGD: { bg: '#fdeaa7', border: '#e9c46a', text: '#3f3200', line: '#f2c14e' },
  WORKSHOP: { bg: '#f48c8c', border: '#e06a6a', text: '#3b0a0a', line: '#ef7f7f' },
  TEAM: { bg: '#ff9d1c', border: '#e8870a', text: '#2b1600', line: '#f59e0b' },
  ENGINEER: { bg: '#ffffff', border: '#1f2937', text: '#111827', line: '#1f2937' },
  STAFF: { bg: '#ffffff', border: '#64748b', text: '#111827', line: '#1f2937' },
  GROUPS: { bg: '#f6bcbc', border: '#e79a9a', text: '#3b0a0a', line: '#1f2937' },
} satisfies Record<string, ChartBoxStyle>;

/** Màu avatar theo mã cấp bậc. */
const LEVEL_COLORS: Record<string, string> = {
  GD: '#7c5a00',
  PGD: '#a77b06',
  QD: '#b42323',
  PQD: '#d14b4b',
  DT: '#c2410c',
  DP: '#ea7a1f',
  TK: '#c2410c',
  KS: '#334155',
  CV: '#475569',
  TT: '#be3f6b',
  NV: '#64748b',
};

export const getLevelColor = (levelCode?: string | null) => (levelCode && LEVEL_COLORS[levelCode]) || '#64748b';

/** Tên chuyên môn (Discipline.Code). */
export const DISCIPLINE_NAME: Record<string, string> = { CK: 'Cơ khí', DIEN: 'Điện', CD: 'Cơ điện' };

interface BlockSplitPart {
  key: string;
  label: string;
  /** Chức danh chứa 1 trong các từ khóa (đã bỏ dấu) thì vào ô này; không có = "còn lại". */
  keywords?: string[];
}

/** Chia 1 khối người thành nhiều ô theo chức danh. Hiện dùng cho Đội KHTH: Kỹ sư chia 2 ô như bản vẽ. */
export const BLOCK_SPLIT_RULES: { unitCode: string; levelCode: string; parts: BlockSplitPart[] }[] = [
  {
    unitCode: 'KHTH',
    levelCode: 'KS',
    parts: [
      { key: 'KH', label: 'KS Kế hoạch tổng hợp', keywords: ['ke hoach tong hop'] },
      { key: 'KT', label: 'KS Kỹ thuật - Chuyên môn' },
    ],
  },
];

/** Kích thước (px), bản thu gọn để cả sơ đồ vừa 1 màn hình; mỗi hàng cao cố định để các ô cùng cấp thẳng hàng. */
export const LAYOUT = {
  PADDING: 16,
  ROW_HEIGHT: { 1: 58, 2: 50, 3: 56, 4: 66, 5: 58, 6: 54 } as Record<number, number>,
  /** Khoảng dọc giữa 2 hàng (đường nối đi trong khoảng này). */
  ROW_GAP: 24,
  /** Khoảng giữa 2 dải khi xuống dòng. */
  BAND_GAP: 32,
  /** Khoảng giữa 2 cột Đội. */
  COL_GAP: 8,
  /** Khoảng giữa 2 Xưởng. */
  GROUP_GAP: 22,
  /** Từ trục dọc tới ô Kỹ sư treo bên cạnh. */
  SIDE_GAP: 8,
  /** Khoảng trống bên phải trục dọc khi không có ô treo bên phải. */
  SPINE_MARGIN: 14,
  /** Giữa 2 ô cùng hàng trong 1 cột. */
  BOX_GAP: 6,
  DIRECTOR_WIDTH: 230,
  DEPUTY_WIDTH: 190,
  DEPUTY_GAP: 12,
  /** Khe giữa 2 nhóm PGĐ để trục chính đi qua. */
  DEPUTY_CENTER_GAP: 28,
  WIDTH: { WORKSHOP: 170, UNIT: 96, SIDE: 74, BLOCK: 96 },
  /** "Vừa màn hình" không phóng quá mức này. */
  MAX_FIT_SCALE: 1.25,
};

export const LAST_CHART_ROW = 6;

/** Số dải xếp các Xưởng. */
export const BAND_OPTIONS = [1, 2, 3] as const;
export type BandOption = (typeof BAND_OPTIONS)[number] | 'auto';

/** Chú thích màu trên thanh công cụ. */
export const LEGEND = [
  { label: 'Ban Giám đốc', style: BOX_STYLE.BGD },
  { label: 'Quản đốc', style: BOX_STYLE.WORKSHOP },
  { label: 'Đội trưởng', style: BOX_STYLE.TEAM },
  { label: 'Kỹ sư / Chuyên viên', style: BOX_STYLE.ENGINEER },
  { label: 'Tổ', style: BOX_STYLE.GROUPS },
];
