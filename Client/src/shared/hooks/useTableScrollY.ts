import { useCallback, useEffect, useState } from 'react';

const TABLE_HEADER_SELECTOR = '.ant-table-header';

/**
 * Chiều cao phần thân Table (scroll.y) để bảng vừa khít khung chứa có chiều cao cố định:
 * thân bảng cuộn bên trong, tiêu đề cột đứng yên. Gắn `containerRef` vào div bọc Table
 * (div cần có chiều cao xác định, vd `flex-1 min-h-0` trong khung flex cao cố định).
 * Tự tính lại khi khung đổi kích thước (xoay màn hình, thu gọn menu, bộ lọc xuống dòng…).
 */
export const useTableScrollY = () => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState<number>();

  const containerRef = useCallback((node: HTMLDivElement | null) => setContainer(node), []);

  useEffect(() => {
    if (!container) return undefined;

    const measure = () => {
      const headerHeight = container.querySelector<HTMLElement>(TABLE_HEADER_SELECTOR)?.offsetHeight ?? 0;
      setScrollY(Math.max(container.clientHeight - headerHeight, 0));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  return { containerRef, scrollY };
};
