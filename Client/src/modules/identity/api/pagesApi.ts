import { httpDelete, httpGet, httpPost, httpPut } from '@/shared/api/axiosClient';
import type { Page, PageRequest, ReorderPagesRequest } from '@/modules/identity/types/pages';

/** Cây mọi trang của cả 2 menu (kể cả trang ẩn / ngừng). */
export const getPageTree = () => httpGet<Page[]>('/pages');

export const createPage = (request: PageRequest) => httpPost<Page>('/pages', request);

export const updatePage = (id: number, request: PageRequest) => httpPut<Page>(`/pages/${id}`, request);

/** Chỉ xóa được trang không còn trang con. */
export const deletePage = (id: number) => httpDelete<null>(`/pages/${id}`);

export const reorderPages = (request: ReorderPagesRequest) => httpPut<null>('/pages/reorder', request);
