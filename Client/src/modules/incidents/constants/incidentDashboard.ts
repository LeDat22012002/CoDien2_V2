/**
 * Màu biểu đồ dashboard sự cố (bảng màu đã kiểm tra mù màu, skill dataviz).
 * Màu theo đối tượng, không theo thứ hạng: xưởng lấy màu theo thứ tự cố định trong danh mục xưởng,
 * nên lọc / sắp xếp lại không đổi màu của xưởng.
 */

/** Màu phân loại, dùng lần lượt theo thứ tự cố định (không tự sinh màu thứ 9). */
export const CATEGORICAL_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#6250d6',
  '#e34948',
] as const;

/** Ngoài bảng màu (quá 8 nhóm, hoặc "chưa gán xưởng"). */
export const OTHER_COLOR = '#898781';

/** Loại sự cố: cùng tông với Tag ở bảng danh sách (Cơ xanh dương, Điện vàng, Công nghệ xanh ngọc). */
export const INCIDENT_TYPE_CHART_COLOR: Record<string, string> = {
  Cơ: '#2a78d6',
  Điện: '#eda100',
  'Công nghệ': '#1baf7a',
  Khác: '#6250d6',
};

/** Kíp: màu cố định theo tên kíp, dùng chung cho biểu đồ số sự cố và thời gian sự cố theo kíp. */
export const SHIFT_CHART_COLOR: Record<string, string> = {
  A: '#2a78d6',
  B: '#eb6834',
  C: '#1baf7a',
};

/** Trạng thái (luôn đi kèm chữ, không chỉ dựa vào màu). */
export const STATUS_CHART_COLOR = {
  good: '#0ca30c',
  critical: '#d03b3b',
  serious: '#ec835a',
} as const;

/** Màu cột 1 dãy số liệu (sự cố theo cấp dừng). */
export const SINGLE_SERIES_COLOR = '#2a78d6';

export const CHART_INK = {
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
} as const;

export const CHART_HEIGHT = 320;
