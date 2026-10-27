import { UNIT_TYPE_META } from '@/shared/constants/organization';
import type { OrgUnit } from '@/shared/types/organization';

export interface OrgUnitTreeNode {
  value: number | string;
  title: string;
  typeName: string;
  /** Lọc theo tên + mã đơn vị trong TreeSelect (treeNodeFilterProp). */
  searchText: string;
  disabled?: boolean;
  children?: OrgUnitTreeNode[];
}

const byOrder = (a: OrgUnit, b: OrgUnit) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi');

/** parentId → các đơn vị con đang hoạt động (đã sắp theo thứ tự hiển thị); gốc dùng key 'ROOT'. */
export const groupChildren = (units: OrgUnit[]) => {
  const map = new Map<number | 'ROOT', OrgUnit[]>();
  units.forEach((unit) => {
    if (!unit.isActive) return;
    const key = unit.parentId ?? 'ROOT';
    map.set(key, [...(map.get(key) ?? []), unit]);
  });
  map.forEach((list) => list.sort(byOrder));
  return map;
};

/**
 * Cây cho TreeSelect từ danh sách đơn vị phẳng (bỏ đơn vị đã xóa).
 * valueKey: 'id' (lọc danh sách, chọn đơn vị cha) | 'code' (gửi API chức vụ).
 * isDisabled / isExcluded: chặn chọn hoặc bỏ hẳn 1 nhánh (vd không chọn nhánh con của chính nó làm cha).
 */
export const buildUnitTree = (
  units: OrgUnit[],
  valueKey: 'id' | 'code',
  options: { isDisabled?: (unit: OrgUnit) => boolean; isExcluded?: (unit: OrgUnit) => boolean } = {},
): OrgUnitTreeNode[] => {
  const childrenByParent = groupChildren(units);

  const build = (key: number | 'ROOT'): OrgUnitTreeNode[] =>
    (childrenByParent.get(key) ?? [])
      .filter((unit) => !options.isExcluded?.(unit))
      .map((unit) => {
        const children = build(unit.id);
        return {
          value: unit[valueKey],
          title: unit.name,
          typeName: UNIT_TYPE_META[unit.typeCode]?.label ?? unit.typeCode,
          searchText: `${unit.name} ${unit.code}`,
          disabled: options.isDisabled?.(unit),
          children: children.length > 0 ? children : undefined,
        };
      });

  return build('ROOT');
};

/** Tiêu đề node: loại đơn vị (chữ phụ) + tên. */
export const renderUnitTreeTitle = (node: OrgUnitTreeNode) => (
  <span>
    <span className="mr-1 text-xs text-text-secondary">{node.typeName}</span>
    {node.title}
  </span>
);
