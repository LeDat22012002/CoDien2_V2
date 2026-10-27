import { SearchOutlined } from '@ant-design/icons';
import { Empty, Input, Skeleton, Tag, Tree, type TreeDataNode } from 'antd';
import { useMemo } from 'react';
import { UNIT_TYPE_META } from '@/shared/constants/organization';
import type { OrgUnit } from '@/shared/types/organization';
import { normalizeSearchText } from '@/modules/organization/utils/orgUnitRules';

interface OrgUnitTreePanelProps {
  /** parentId → đơn vị con đang hoạt động (đã sắp xếp). */
  childrenMap: Map<number | 'ROOT', OrgUnit[]>;
  selectedId?: number;
  keyword: string;
  /** Node đang mở khi không tìm kiếm. */
  expandedKeys: number[];
  isLoading: boolean;
  onKeywordChange: (keyword: string) => void;
  onExpand: (keys: number[]) => void;
  onSelect: (unitId: number) => void;
}

/** Cây đơn vị (trái): tìm theo tên / mã không phân biệt dấu; đang tìm thì tự mở các nhánh có kết quả. */
export const OrgUnitTreePanel = ({
  childrenMap,
  selectedId,
  keyword,
  expandedKeys,
  isLoading,
  onKeywordChange,
  onExpand,
  onSelect,
}: OrgUnitTreePanelProps) => {
  const { treeData, matchedParentKeys } = useMemo(() => {
    const search = normalizeSearchText(keyword.trim());
    const parents = new Set<number>();

    const build = (key: number | 'ROOT', ancestors: number[]): TreeDataNode[] =>
      (childrenMap.get(key) ?? []).flatMap((unit) => {
        const children = build(unit.id, [...ancestors, unit.id]);
        const isMatch = Boolean(search) && normalizeSearchText(`${unit.name} ${unit.code}`).includes(search);
        if (isMatch) ancestors.forEach((id) => parents.add(id));
        if (search && !isMatch && children.length === 0) return [];
        const meta = UNIT_TYPE_META[unit.typeCode];
        return [
          {
            key: unit.id,
            title: (
              <span className={`inline-flex items-center gap-1.5 ${isMatch ? 'font-semibold text-primary' : ''}`}>
                <Tag color={meta?.color}>{meta?.label}</Tag>
                <span>{unit.name}</span>
              </span>
            ),
            children: children.length > 0 ? children : undefined,
          },
        ];
      });

    return { treeData: build('ROOT', []), matchedParentKeys: [...parents] };
  }, [childrenMap, keyword]);

  const isSearching = Boolean(keyword.trim());

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Input
        allowClear
        aria-label="Tìm đơn vị"
        prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
        placeholder="Tìm tên hoặc mã đơn vị…"
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : treeData.length > 0 ? (
          <Tree
            showLine
            blockNode
            treeData={treeData}
            expandedKeys={isSearching ? matchedParentKeys : expandedKeys}
            onExpand={(keys) => onExpand(keys.map(Number))}
            selectedKeys={selectedId ? [selectedId] : []}
            onSelect={(keys) => keys.length > 0 && onSelect(Number(keys[0]))}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy đơn vị" />
        )}
      </div>
    </div>
  );
};
