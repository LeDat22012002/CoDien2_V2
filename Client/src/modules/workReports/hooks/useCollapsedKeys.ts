import { useCallback, useState } from "react";

/**
 * Danh sách khóa đang thu gọn (nhóm dòng của bảng: tổ/kíp, đầu mục…). Mặc định mở hết.
 * Dùng kèm CollapseToggle (nút mũi tên) và COLLAPSIBLE_TABLE_COMPONENTS / collapsibleRowProps (hiệu ứng thu/mở dòng).
 */
export const useCollapsedKeys = () => {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggle = useCallback(
    (key: string) =>
      setCollapsed((previous) => {
        const next = new Set(previous);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    [],
  );

  /** Mở các khóa (vd mở nhóm vừa bấm "Thêm dòng"). */
  const expand = useCallback(
    (...keys: string[]) =>
      setCollapsed((previous) => {
        if (!keys.some((key) => previous.has(key))) return previous;
        const next = new Set(previous);
        keys.forEach((key) => next.delete(key));
        return next;
      }),
    [],
  );

  /** Thu gọn nhiều khóa cùng lúc (vd "Thu gọn tất cả"). */
  const collapseAll = useCallback(
    (keys: string[]) => setCollapsed(new Set(keys)),
    [],
  );

  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  return { collapsed, toggle, expand, collapseAll, expandAll };
};
