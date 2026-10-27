import { useMemo } from 'react';

/** Phần tử dấu "…" giữa các số trang. */
export const PAGINATION_DOTS = 'dots';

export type PaginationItem = number | typeof PAGINATION_DOTS;

const generateRange = (start: number, end: number) =>
  Array.from({ length: Math.max(end + 1 - start, 0) }, (_, index) => start + index);

/**
 * Dãy số trang hiển thị (giống usePagination hệ thống cũ):
 * ít trang thì hiện hết; nhiều trang thì giữ trang đầu, trang cuối, trang hiện tại ± siblingCount và chèn "…".
 */
export const usePagination = (totalCount: number, currentPage: number, pageSize: number, siblingCount = 1) =>
  useMemo<PaginationItem[]>(() => {
    const pageCount = Math.ceil(totalCount / pageSize);
    const totalPaginationItem = siblingCount + 5;

    if (pageCount <= totalPaginationItem) return generateRange(1, pageCount);

    const isShowLeft = currentPage - siblingCount > 2;
    const isShowRight = currentPage + siblingCount < pageCount - 1;

    if (isShowLeft && !isShowRight) return [1, PAGINATION_DOTS, ...generateRange(pageCount - 4, pageCount)];
    if (!isShowLeft && isShowRight) return [...generateRange(1, 5), PAGINATION_DOTS, pageCount];
    if (isShowLeft && isShowRight) {
      const siblingLeft = Math.max(currentPage - siblingCount, 1);
      const siblingRight = Math.min(currentPage + siblingCount, pageCount);
      return [1, PAGINATION_DOTS, ...generateRange(siblingLeft, siblingRight), PAGINATION_DOTS, pageCount];
    }

    return generateRange(1, pageCount);
  }, [totalCount, currentPage, pageSize, siblingCount]);
