import type { OrgUnit, OrgUnitType, OrgUnitTypeCode } from '@/shared/types/organization';

/** Bỏ dấu tiếng Việt + chữ thường, để tìm "doi dien" ra "Đội Điện". */
export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

/** Id của đơn vị và mọi đơn vị con cháu. */
export const getDescendantIds = (id: number, childrenMap: Map<number | 'ROOT', OrgUnit[]>) => {
  const result = new Set([id]);
  const stack = [id];
  while (stack.length > 0) {
    const currentId = stack.pop() as number;
    (childrenMap.get(currentId) ?? []).forEach((child) => {
      result.add(child.id);
      stack.push(child.id);
    });
  }
  return result;
};

/** Loại đơn vị con hợp lệ dưới 1 loại cha (theo lookups.orgUnitTypes[].allowedParentTypes). */
export const getAllowedChildTypes = (parentTypeCode: OrgUnitTypeCode, unitTypes: OrgUnitType[]) =>
  unitTypes.filter((type) => type.allowedParentTypes.includes(parentTypeCode)).map((type) => type.code);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Gợi ý mã đơn vị mới theo quy tắc đang dùng:
 *  Đội dưới Xưởng  → {mã Xưởng}-D06
 *  Ca dưới Xưởng   → {mã Xưởng}-CA (đã có thì -CA2…)
 *  Tổ dưới Đội/Ca  → {mã cha}-T05
 *  Còn lại (Xưởng, Đội/Bộ phận trực thuộc Nhà máy) → để người dùng tự đặt
 * allCodes: mã của MỌI đơn vị kể cả đã xóa (mã không được dùng lại).
 */
export const suggestUnitCode = (parent: OrgUnit | undefined, typeCode: OrgUnitTypeCode, allCodes: string[]) => {
  if (!parent) return '';
  const codes = new Set(allCodes);
  const next = (prefix: string) => {
    const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);
    const max = allCodes.reduce((current, code) => Math.max(current, Number(code.match(pattern)?.[1] ?? 0)), 0);
    return `${prefix}${String(max + 1).padStart(2, '0')}`;
  };

  if (typeCode === 'TEAM' && parent.typeCode === 'WORKSHOP') return next(`${parent.code}-D`);
  if (typeCode === 'GROUP') return next(`${parent.code}-T`);
  if (typeCode === 'SHIFT') {
    if (!codes.has(`${parent.code}-CA`)) return `${parent.code}-CA`;
    let index = 2;
    while (codes.has(`${parent.code}-CA${index}`)) index += 1;
    return `${parent.code}-CA${index}`;
  }
  return '';
};

/** Gợi ý tên theo loại + chuyên môn (người dùng sửa tiếp phần khu vực). */
export const suggestUnitName = (typeCode: OrgUnitTypeCode, disciplineName?: string) => {
  if (typeCode === 'TEAM') return disciplineName ? `Đội ${disciplineName} - ` : 'Đội ';
  if (typeCode === 'GROUP') return disciplineName ? `Tổ ${disciplineName} - ` : 'Tổ ';
  if (typeCode === 'WORKSHOP') return 'Xưởng Cơ điện ';
  if (typeCode === 'SHIFT') return 'Kỹ sư Cơ điện - Theo ca';
  return '';
};
