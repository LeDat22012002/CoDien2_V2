import type { Breakpoint, TableColumnsType } from 'antd';

/**
 * Độ rộng cột chuẩn (px) cho mọi Table. Mỗi cột phải khai báo `width` từ đây (thiếu loại thì bổ sung vào đây,
 * không đặt số rời rạc trong module). Bảng dùng tableLayout="fixed" + scroll.x = getTableScrollX(...):
 * cột giữ đúng tỉ lệ, chữ dài cắt "…" (hover xem đủ), màn hình hẹp thì cuộn ngang trong bảng.
 */
export const COLUMN_WIDTH = {
  /** STT. */
  index: 60,
  /** Mã ngắn: mã NV, mã thiết bị… */
  code: 110,
  /** Số điện thoại. */
  phone: 130,
  /** Ngày DD/MM/YYYY. */
  date: 120,
  /** Ngày giờ DD/MM/YYYY HH:mm. */
  dateTime: 150,
  /** Số lượng, tiền. */
  number: 120,
  /** Tag ngắn: cấp bậc, loại… */
  tag: 130,
  /** Tag trạng thái có icon + chữ. */
  status: 150,
  /** Họ tên (có thể kèm email dòng dưới). */
  name: 220,
  /** Chữ vừa: tên đơn vị, tên thiết bị… */
  text: 220,
  /** Chữ dài: chức danh, mô tả, ghi chú… */
  longText: 280,
  /** Ô chọn (Select) sửa trực tiếp trong bảng. */
  select: 180,
  /** Cột thao tác 3 nút icon. */
  actions: 130,
} as const;

type ScreenMap = Partial<Record<Breakpoint, boolean>>;

/** Tổng độ rộng các cột đang hiển thị (bỏ cột có `responsive` chưa tới breakpoint) cho scroll.x. */
export const getTableScrollX = <T>(columns: TableColumnsType<T>, screens: ScreenMap) =>
  columns.reduce((total, column) => {
    const isVisible = !column.responsive || column.responsive.some((breakpoint) => screens[breakpoint]);
    return isVisible && typeof column.width === 'number' ? total + column.width : total;
  }, 0);
