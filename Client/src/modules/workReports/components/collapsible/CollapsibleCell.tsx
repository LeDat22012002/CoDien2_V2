import type { TdHTMLAttributes } from "react";

/*
 * <tr> không co chiều cao mượt được nên co từng ô: lưới 1fr → 0fr cho nội dung, padding + viền dưới về 0, mờ dần.
 * - in-data-[collapsed=true]: áp dụng khi <tr> cha có data-collapsed="true" (do collapsibleRowProps gắn).
 * - Không cần `!`: style AntD nằm trong @layer antd (trước utilities, xem index.css) nên class Tailwind luôn thắng.
 *   transition của ô thay hẳn transition mặc định của AntD (chỉ màu nền/viền) nên giữ lại background-color,
 *   border-color để không mất hiệu ứng hover.
 * - Thời gian: biến --collapse-duration trên Table hoặc phần tử cha (mặc định 200ms).
 * - overflow-clip (không dùng hidden): không tạo vùng cuộn nên nội dung sticky bên trong vẫn chạy;
 *   clip-margin để không cắt viền focus của ô nhập khi đang mở.
 * Giữ chuỗi class đầy đủ (không ghép bằng biến) để Tailwind quét được.
 */
const CELL_CLASS =
  "transition-[padding,border-width,background-color,border-color] duration-[var(--collapse-duration,200ms)] ease-out motion-reduce:transition-none in-data-[collapsed=true]:py-0 in-data-[collapsed=true]:border-b-0";
const BODY_CLASS =
  "grid grid-cols-[minmax(0,1fr)] grid-rows-[1fr] transition-[grid-template-rows] duration-[var(--collapse-duration,200ms)] ease-out motion-reduce:transition-none in-data-[collapsed=true]:grid-rows-[0fr]";
const CLIP_CLASS =
  "min-h-0 min-w-0 overflow-clip [overflow-clip-margin:4px] transition-opacity duration-[var(--collapse-duration,200ms)] ease-out motion-reduce:transition-none in-data-[collapsed=true]:opacity-0";

/** Ô thân bảng AntD có hiệu ứng thu/mở (dùng qua COLLAPSIBLE_TABLE_COMPONENTS). */
export const CollapsibleCell = ({
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    {...rest}
    className={className ? `${CELL_CLASS} ${className}` : CELL_CLASS}
  >
    <div className={BODY_CLASS}>
      <div className={CLIP_CLASS}>{children}</div>
    </div>
  </td>
);
