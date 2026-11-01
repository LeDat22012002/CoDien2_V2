import type { PageArea } from '@/modules/identity/types/pages';

/** Các menu quản lý ở trang Trang và menu (thứ tự hiện trên tab). */
export const PAGE_AREA_OPTIONS: { value: PageArea; label: string }[] = [
  { value: 'ADMIN', label: 'Menu quản trị' },
  { value: 'MEMBER', label: 'Menu trang cá nhân' },
  { value: 'PUBLIC', label: 'Menu trang công khai' },
];

export const getPageAreaLabel = (area: PageArea) =>
  PAGE_AREA_OPTIONS.find((option) => option.value === area)?.label ?? area;

/** Trang quản trị và trang cá nhân gắn được quyền; menu công khai chỉ là liên kết điều hướng. */
export const canAreaHavePermission = (area: PageArea) => area !== 'PUBLIC';
