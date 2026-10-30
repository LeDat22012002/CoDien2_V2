/** Danh mục cố định của báo cáo sự cố (giữ như hệ thống cũ). */

export const SHIFT_OPTIONS = ['A', 'B', 'C'].map((value) => ({ label: value, value }));

export const INCIDENT_TYPES = ['Cơ', 'Điện', 'Công nghệ', 'Khác'] as const;
export const INCIDENT_TYPE_OPTIONS = INCIDENT_TYPES.map((value) => ({ label: value, value }));

/** Màu Tag theo loại sự cố. */
export const INCIDENT_TYPE_COLOR: Record<string, string> = {
  Cơ: 'blue',
  Điện: 'gold',
  'Công nghệ': 'cyan',
  Khác: 'default',
};

export const STOP_LEVEL_OPTIONS = ['Không dừng', 'Thiết bị', 'Dây chuyền', 'Cụm thiết bị'].map((value) => ({
  label: value,
  value,
}));

/** Giá trị trên URL của bộ lọc Ảnh hưởng sản xuất. */
export const AFFECTS_PRODUCTION_OPTIONS = [
  { label: 'Có', value: 'true' },
  { label: 'Không', value: 'false' },
];

export const INCIDENT_PAGE_SIZE = 20;
export const INCIDENT_PAGE_SIZE_OPTIONS = [20, 50, 100];

// ===== Ngưỡng cảnh báo (đồng bộ IncidentRules ở Server) =====

/** Quá N ngày kể từ khi nhập mà chưa đủ Nguyên nhân / Nguyên nhân gốc / Hành động. */
export const ANALYSIS_DUE_DAYS = 7;
/** Sự cố ảnh hưởng sản xuất: quá N ngày mà còn thiếu Số order / Link biên bản. */
export const SUPPLEMENT_DUE_DAYS = 3;
/** Dừng máy (nhận thông tin → bàn giao) quá N phút thì bắt buộc có biên bản sự cố. */
export const REPORT_REQUIRED_DOWNTIME_MINUTES = 90;
