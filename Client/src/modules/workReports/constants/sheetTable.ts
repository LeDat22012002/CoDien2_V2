/**
 * Giao diện chung của các bảng dạng sheet Excel trong module (Bảng công việc, Vật tư xưởng):
 * chữ nhỏ, viền rõ từng ô, tiêu đề cột nền đặc, dòng tiêu đề tổ/kíp (vàng) và đầu mục (xanh).
 */

/** Cỡ chữ bảng (nhỏ hơn mặc định của app cho giống sheet Excel). */
export const SHEET_TABLE_THEME = {
  token: { fontSize: 12 },
  components: { Table: { cellPaddingBlockSM: 4, cellPaddingInlineSM: 6 } },
};

/** className của Table: thanh tiêu đề, viền ô, nền tiêu đề cột đặc (nội dung cuộn không lộ qua). */
export const SHEET_TABLE_CLASS = [
  "[&_.ant-table-title]:bg-warning/25",
  "[&_.ant-table-cell]:border-[color-mix(in_srgb,var(--app-color-text)_25%,transparent)]",
  "[&_.ant-table-container]:border-[color-mix(in_srgb,var(--app-color-text)_25%,transparent)]",
  "[&_.ant-table-title]:border-[color-mix(in_srgb,var(--app-color-text)_25%,transparent)]",
  "[&_.ant-table-thead_th]:bg-[color-mix(in_srgb,var(--app-color-primary)_12%,var(--app-color-bg-container))]",
  "[&_.ant-table-thead_th]:text-center [&_.ant-table-thead_th]:align-middle [&_.ant-table-thead_th]:font-semibold",
  "[&_.ant-table-thead_th]:whitespace-normal",
  "[&_.ant-form-item-extra]:min-h-0 [&_.ant-form-item-extra]:text-xs",
  "[&_.ant-table-tbody_td]:align-middle",
].join(" ");

/** Nền đặc (không trong suốt) cho dòng tiêu đề: ô ghim trái phải che được nội dung cuộn bên dưới. */
export const UNIT_ROW_BG =
  "bg-[color-mix(in_srgb,var(--app-color-warning)_15%,var(--app-color-bg-container))]";
export const GROUP_ROW_BG =
  "bg-[color-mix(in_srgb,var(--app-color-success)_10%,var(--app-color-bg-container))]";

/** Dòng đang sửa: tô từng ô (ô ghim trái có nền riêng nên tô cả dòng không thấy). */
export const EDITING_ROW_CLASS =
  "[&>td]:bg-[color-mix(in_srgb,var(--app-color-primary)_6%,var(--app-color-bg-container))]";
