import type { OrgChartPerson } from '@/modules/organization/types/orgChart';

/** "Nguyễn Văn An" → "NA" */
export const getInitials = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** Họ tên ngắn trên ô hẹp: "Nguyễn Văn Thành An" → "Thành An" */
export const getShortName = (fullName = '') => fullName.trim().split(/\s+/).slice(-2).join(' ');

/** Bỏ dấu + chữ thường để tìm kiếm tiếng Việt. */
export const normalizeChartText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

/** Bỏ đuôi " - Xưởng …" trong chức danh cho gọn. */
export const getShortJobTitle = (title?: string | null) => (title ?? '').replace(/\s*-\s*Xưởng\s.+$/i, '').trim();

/** "Đội Cơ khí - Lò cao 1, 2" → "Cơ khí - Lò cao 1, 2" */
export const stripUnitPrefix = (name?: string | null) => (name ?? '').replace(/^(Đội|Xưởng|Tổ)\s+/i, '');

/** Chức danh chung nếu cả khối giống nhau, ngược lại null. */
export const getCommonJobTitle = (people: OrgChartPerson[] = []) => {
  const titles = [...new Set(people.map((person) => getShortJobTitle(person.jobTitle)).filter(Boolean))];
  return titles.length === 1 ? titles[0] : null;
};

/** Gom chuỗi để tìm kiếm cho 1 danh sách người. */
export const getPeopleText = (people: OrgChartPerson[] = []) =>
  people.map((person) => `${person.fullName} ${person.empCode} ${person.jobTitle ?? ''}`).join(' ');
