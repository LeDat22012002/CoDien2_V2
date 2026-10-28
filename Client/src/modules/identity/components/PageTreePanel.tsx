import { ExportOutlined, SearchOutlined } from '@ant-design/icons';
import { Empty, Input, Skeleton, Tag, Tree, type TreeDataNode } from 'antd';
import { useMemo } from 'react';
import { getMenuIcon } from '@/shared/constants/menuIcons';
import { normalizeSearchText } from '@/modules/identity/constants/roleOptions';
import type { Page } from '@/modules/identity/types/pages';

interface PageTreePanelProps {
  /** Các trang cấp gốc của menu đang xem (children đã sắp xếp). */
  pages: Page[];
  selectedId?: number;
  keyword: string;
  expandedKeys: number[];
  isLoading: boolean;
  onKeywordChange: (keyword: string) => void;
  onExpand: (keys: number[]) => void;
  onSelect: (pageId: number) => void;
}

/** Cây trang (trái), giống menu thật: icon + tiêu đề + nhãn trạng thái. Tìm theo tiêu đề / mã / đường dẫn. */
export const PageTreePanel = ({
  pages,
  selectedId,
  keyword,
  expandedKeys,
  isLoading,
  onKeywordChange,
  onExpand,
  onSelect,
}: PageTreePanelProps) => {
  const { treeData, matchedParentKeys } = useMemo(() => {
    const search = normalizeSearchText(keyword);
    const parents = new Set<number>();

    const build = (items: Page[], ancestors: number[]): TreeDataNode[] =>
      items.flatMap((page) => {
        const children = build(page.children, [...ancestors, page.id]);
        const isMatch =
          Boolean(search) &&
          normalizeSearchText(`${page.title} ${page.code} ${page.path ?? ''}`).includes(search);
        if (isMatch) ancestors.forEach((id) => parents.add(id));
        if (search && !isMatch && children.length === 0) return [];
        return [
          {
            key: page.id,
            title: (
              <span
                className={`inline-flex items-center gap-1.5 ${isMatch ? 'font-semibold text-primary' : ''} ${
                  page.isActive ? '' : 'text-text-secondary line-through'
                }`}
              >
                {page.icon && getMenuIcon(page.icon)}
                <span>{page.title}</span>
                {page.externalUrl && <ExportOutlined className="text-text-secondary" aria-label="Liên kết ngoài" />}
                {!page.isMenu && <Tag className="me-0">Ẩn</Tag>}
                {!page.isActive && <Tag className="me-0">Ngừng</Tag>}
              </span>
            ),
            children: children.length > 0 ? children : undefined,
          },
        ];
      });

    return { treeData: build(pages, []), matchedParentKeys: [...parents] };
  }, [pages, keyword]);

  const isSearching = Boolean(keyword.trim());

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Input
        allowClear
        aria-label="Tìm trang"
        prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
        placeholder="Tìm tiêu đề, mã hoặc đường dẫn…"
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
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={isSearching ? 'Không tìm thấy trang' : 'Menu chưa có trang nào'}
          />
        )}
      </div>
    </div>
  );
};
