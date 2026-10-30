import { useCallback, useEffect, useState } from 'react';

const TABLE_HEADER_SELECTOR = '.ant-table-header';

/**
 * Chiều cao phần thân Table (scroll.y) để bảng vừa khít khung chứa có chiều cao cố định:
 * thân bảng cuộn bên trong, tiêu đề cột đứng yên. Gắn `containerRef` vào div bọc Table
 * (div cần có chiều cao xác định, vd `flex-1 min-h-0` trong khung flex cao cố định).
 * Tự tính lại khi khung hoặc hàng tiêu đề cột đổi kích thước (xoay màn hình, thu gọn menu, bộ lọc xuống dòng,
 * font tải xong, tiêu đề cột render sau…).
 */
export const useTableScrollY = () => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState<number>();

  const containerRef = useCallback((node: HTMLDivElement | null) => setContainer(node), []);

  useEffect(() => {
    if (!container) return undefined;

    let observedHeader: HTMLElement | null = null;

    const measure = () => {
      const header = container.querySelector<HTMLElement>(TABLE_HEADER_SELECTOR);
      // Hàng tiêu đề có thể render sau hoặc bị thay mới: theo dõi đúng phần tử đang hiển thị
      if (header !== observedHeader) {
        if (observedHeader) resizeObserver.unobserve(observedHeader);
        if (header) resizeObserver.observe(header);
        observedHeader = header;
      }
      // Tính từ mép trên khung tới đáy hàng tiêu đề (gồm cả viền trên của bảng bordered),
      // để thanh cuộn ngang ở đáy thân bảng không bị khung cắt mất
      const headerBottom = header
        ? header.getBoundingClientRect().bottom - container.getBoundingClientRect().top
        : 0;
      setScrollY(Math.max(Math.floor(container.clientHeight - headerBottom), 0));
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    // Table đổi cấu trúc (có / hết dữ liệu, loading) thì đo lại
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [container]);

  return { containerRef, scrollY };
};
