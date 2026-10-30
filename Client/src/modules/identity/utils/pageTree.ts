import type { Page, PageArea } from '@/modules/identity/types/pages';

/** Khoảng cách SortOrder giữa các trang cùng cấp (khớp PageService.ReorderAsync ở Server). */
export const SORT_ORDER_STEP = 10;

export type PageLinkType = 'path' | 'external' | 'group';

/** Trang có đường dẫn / liên kết ngoài, hay chỉ là nút nhóm menu. */
export const getPageLinkType = (page: Pick<Page, 'path' | 'externalUrl'>): PageLinkType =>
  page.path ? 'path' : page.externalUrl ? 'external' : 'group';

export const flattenPages = (pages: Page[]): Page[] => pages.flatMap((page) => [page, ...flattenPages(page.children)]);

/** Các trang cùng cấp với parentId (null = cấp gốc của area). */
export const getSiblings = (tree: Page[], area: PageArea, parentId: number | null | undefined): Page[] =>
  parentId
    ? (flattenPages(tree).find((page) => page.id === parentId)?.children ?? [])
    : tree.filter((page) => page.area === area);

export const getNextSortOrder = (siblings: Page[]) =>
  siblings.reduce((max, page) => Math.max(max, page.sortOrder), 0) + SORT_ORDER_STEP;

/** Id của trang và mọi trang con cháu (không được chọn làm trang cha). */
export const getSelfAndDescendantIds = (page: Page): Set<number> =>
  new Set(flattenPages([page]).map((item) => item.id));

/** Sắp lại các trang cùng cấp theo orderedIds (cập nhật lạc quan trước khi Server trả về). */
export const reorderPageTree = (tree: Page[], parentId: number | null, orderedIds: number[]): Page[] => {
  const reorder = (pages: Page[]) =>
    [...pages]
      .map((page) =>
        orderedIds.includes(page.id) ? { ...page, sortOrder: (orderedIds.indexOf(page.id) + 1) * SORT_ORDER_STEP } : page,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);

  if (parentId === null) {
    // Cấp gốc gồm cả 2 menu: chỉ sắp phần của menu đang đổi, giữ nguyên menu kia
    const changed = reorder(tree.filter((page) => orderedIds.includes(page.id)));
    return [...changed, ...tree.filter((page) => !orderedIds.includes(page.id))];
  }

  const visit = (pages: Page[]): Page[] =>
    pages.map((page) =>
      page.id === parentId ? { ...page, children: reorder(page.children) } : { ...page, children: visit(page.children) },
    );
  return visit(tree);
};

/** Tiêu đề → mã trang gợi ý: chữ thường không dấu, nối bằng '-' (vd "Phiếu nhập" → "phieu-nhap"). */
export const toPageCode = (title: string) =>
  title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
