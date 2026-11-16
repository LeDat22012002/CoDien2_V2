import type { HTMLAttributes } from "react";
import { CollapsibleCell } from "@/modules/workReports/components/collapsible/CollapsibleCell";

/**
 * Gắn vào Table AntD để các dòng thu/mở có hiệu ứng:
 *   <Table components={COLLAPSIBLE_TABLE_COMPONENTS} onRow={(row) => ({ ...collapsibleRowProps(row.collapsed) })} />
 * Hằng số đặt ngoài component để Table không dựng lại ô mỗi lần render.
 */
export const COLLAPSIBLE_TABLE_COMPONENTS = {
  body: { cell: CollapsibleCell },
};

/**
 * Thuộc tính cho <tr> của dòng đang thu gọn: vẫn nằm trong DOM (để chạy hiệu ứng)
 * nhưng ẩn khỏi trình đọc màn hình và không Tab / bấm vào được.
 */
export const collapsibleRowProps = (collapsed?: boolean) =>
  ({
    "data-collapsed": collapsed ? "true" : undefined,
    "aria-hidden": collapsed || undefined,
    inert: collapsed || undefined,
  }) as HTMLAttributes<HTMLElement>;
