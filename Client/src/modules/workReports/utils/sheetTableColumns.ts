import type { ColumnType } from "antd/es/table";

/**
 * Gom cột lá của bảng dạng sheet, tự gộp ô cho dòng tiêu đề (tổ/kíp, đầu mục), tối đa 3 ô:
 * ô 1 gộp các cột ghim trái (chứa nội dung), ô 2 gộp các cột giữa, ô 3 gộp các cột ghim phải (ô 2, 3 chỉ tô nền);
 * các cột khác colSpan 0. Tách ô theo nhóm ghim vì AntD không ghim đúng ô gộp vắt qua cột ghim và cột thường.
 * Không có cột ghim trái thì ô 1 gộp từ đầu tới trước nhóm ghim phải.
 * Gọi mỗi lần render: `const { leaf, leafColumns } = createSheetLeafColumns(...)`, bọc từng cột lá bằng `leaf(...)`.
 */
export const createSheetLeafColumns = <T>(
  isHeaderRow: (row: T) => boolean,
  /** Nền của dòng tiêu đề (nền đặc, xem UNIT_ROW_BG / GROUP_ROW_BG). */
  headerRowClass: (row: T) => string,
) => {
  const leafColumns: ColumnType<T>[] = [];

  const leaf = (column: ColumnType<T>): ColumnType<T> => {
    const result: ColumnType<T> = {
      ...column,
      onCell: (row) => {
        if (!isHeaderRow(row)) return {};
        const index = leafColumns.indexOf(result);
        const total = leafColumns.length;
        const leftCount = leafColumns.filter(
          (col) => col.fixed === "left",
        ).length;
        const rightCount = leafColumns.filter(
          (col) => col.fixed === "right",
        ).length;
        const rightStart = total - rightCount;
        const bg = headerRowClass(row);
        if (index === 0) {
          return {
            colSpan: leftCount || rightStart,
            className: `${bg} text-left ${leftCount ? "border-e-0" : ""}`,
          };
        }
        if (leftCount > 0 && index === leftCount && leftCount < rightStart) {
          return {
            colSpan: rightStart - leftCount,
            className: `${bg} ${rightCount ? "border-e-0" : ""}`,
          };
        }
        if (rightCount > 0 && index === rightStart) {
          return { colSpan: rightCount, className: bg };
        }
        return { colSpan: 0 };
      },
    };
    leafColumns.push(result);
    return result;
  };

  return { leaf, leafColumns };
};

/** Tổng độ rộng các cột lá (scroll.x). */
export const sumColumnWidths = <T>(columns: ColumnType<T>[]) =>
  columns.reduce(
    (total, column) =>
      total + (typeof column.width === "number" ? column.width : 0),
    0,
  );
