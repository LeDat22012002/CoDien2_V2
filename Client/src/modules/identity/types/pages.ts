/** ADMIN = menu Sider trang quản trị; PUBLIC = menu header trang công khai. */
export type PageArea = 'ADMIN' | 'PUBLIC';

/** Trang / mục menu (cây, children đã sắp theo sortOrder). */
export interface Page {
  id: number;
  code: string;
  title: string;
  /** Route phía Client, bắt đầu bằng "/". Null với nhóm menu hoặc liên kết ngoài. */
  path?: string | null;
  /** Liên kết ngoài http/https, mở tab mới. */
  externalUrl?: string | null;
  icon?: string | null;
  parentId?: number | null;
  area: PageArea;
  /** Quyền cần để thấy trang (chỉ trang ADMIN); null = ai đăng nhập cũng thấy. */
  permissionId?: number | null;
  permissionCode?: string | null;
  sortOrder: number;
  /** false = không hiện trên menu nhưng route vẫn dùng được (vd trang chi tiết). */
  isMenu: boolean;
  isActive: boolean;
  children: Page[];
}

export interface PageRequest {
  code: string;
  title: string;
  path?: string;
  externalUrl?: string;
  icon?: string;
  parentId?: number;
  area: PageArea;
  permissionId?: number;
  sortOrder: number;
  isMenu: boolean;
  isActive: boolean;
}

/** orderedIds = toàn bộ trang cùng cấp theo thứ tự mới; parentId null = cấp gốc của area. */
export interface ReorderPagesRequest {
  parentId: number | null;
  area: PageArea;
  orderedIds: number[];
}
