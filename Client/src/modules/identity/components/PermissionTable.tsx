import { SearchOutlined } from '@ant-design/icons';
import { Empty, Grid, Input, Segmented, Table, Typography, type TableColumnsType } from 'antd';
import { useMemo, useState, type Key } from 'react';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { useTableScrollY } from '@/shared/hooks/useTableScrollY';
import { getPermissionModuleLabel, normalizeSearchText } from '@/modules/identity/constants/roleOptions';
import type { Permission, PermissionGroup } from '@/modules/identity/types/roles';

type CheckedFilter = 'all' | 'checked' | 'unchecked';

const CHECKED_FILTER_OPTIONS: { value: CheckedFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'checked', label: 'Đã chọn' },
  { value: 'unchecked', label: 'Chưa chọn' },
];

/** Dòng nhóm (module) có các dòng quyền con; key dạng "g:module" / "p:id" để không trùng. */
interface PermissionRow {
  key: string;
  module: string;
  permission?: Permission;
  /** Số quyền đã chọn / tổng của nhóm (dòng nhóm). */
  checkedCount?: number;
  totalCount?: number;
  children?: PermissionRow[];
}

const GROUP_PREFIX = 'g:';
const PERMISSION_PREFIX = 'p:';
const toPermissionKey = (id: number) => `${PERMISSION_PREFIX}${id}`;

interface PermissionTableProps {
  groups: PermissionGroup[];
  selectedIds: ReadonlySet<number>;
  /** Chỉ xem (không có quyền quản lý, hoặc vai trò hệ thống). */
  isReadOnly: boolean;
  onChange: (selectedIds: Set<number>) => void;
}

/**
 * Bảng phân quyền: mỗi nhóm module là 1 dòng cha, mở ra là các quyền. Tick dòng cha = chọn cả nhóm
 * (tự hiện "chọn một phần"). Bảng cao bằng khung cha, thân bảng cuộn bên trong.
 */
export const PermissionTable = ({ groups, selectedIds, isReadOnly, onChange }: PermissionTableProps) => {
  const [keyword, setKeyword] = useState('');
  const [checkedFilter, setCheckedFilter] = useState<CheckedFilter>('all');
  const [collapsedKeys, setCollapsedKeys] = useState<string[]>([]);
  const { containerRef, scrollY } = useTableScrollY();
  const screens = Grid.useBreakpoint();

  const normalizedKeyword = normalizeSearchText(keyword);
  const rows = useMemo<PermissionRow[]>(
    () =>
      groups
        .map((group) => {
          const groupLabel = getPermissionModuleLabel(group.module);
          const children = group.permissions
            .filter((permission) => {
              const isChecked = selectedIds.has(permission.id);
              if (checkedFilter === 'checked' && !isChecked) return false;
              if (checkedFilter === 'unchecked' && isChecked) return false;
              return (
                !normalizedKeyword ||
                normalizeSearchText(`${permission.name} ${permission.code} ${groupLabel}`).includes(normalizedKeyword)
              );
            })
            .map((permission) => ({ key: toPermissionKey(permission.id), module: group.module, permission }));
          return {
            key: `${GROUP_PREFIX}${group.module}`,
            module: group.module,
            checkedCount: group.permissions.filter((permission) => selectedIds.has(permission.id)).length,
            totalCount: group.permissions.length,
            children,
          };
        })
        .filter((row) => row.children.length > 0),
    [groups, selectedIds, checkedFilter, normalizedKeyword],
  );

  // Mặc định mở hết; đang lọc thì luôn mở để thấy kết quả
  const isFiltering = Boolean(normalizedKeyword) || checkedFilter !== 'all';
  const expandedKeys = rows.map((row) => row.key).filter((key) => isFiltering || !collapsedKeys.includes(key));

  // Ô tick bị khóa (chỉ xem) thì antd không tự tính dòng nhóm từ dòng con → khai báo luôn nhóm đã chọn đủ
  const selectedRowKeys = [
    ...[...selectedIds].map(toPermissionKey),
    ...rows
      .filter((row) => row.children?.every((child) => selectedIds.has(child.permission?.id ?? -1)))
      .map((row) => row.key),
  ];

  /**
   * antd trả về key các dòng đang tick (gồm cả dòng nhóm). Chỉ đổi các quyền đang hiển thị
   * để quyền bị ẩn do bộ lọc không bị bỏ chọn theo.
   */
  const handleSelectionChange = (keys: Key[]) => {
    const checkedKeys = new Set(keys.map(String));
    const next = new Set(selectedIds);
    rows.forEach((row) =>
      row.children?.forEach((child) => {
        const id = child.permission?.id;
        if (id === undefined) return;
        if (checkedKeys.has(child.key)) next.add(id);
        else next.delete(id);
      }),
    );
    onChange(next);
  };

  const columns: TableColumnsType<PermissionRow> = [
    {
      title: 'Quyền',
      key: 'name',
      width: COLUMN_WIDTH.longText,
      render: (_, row) =>
        row.permission ? (
          <Typography.Text ellipsis={{ tooltip: row.permission.name }} className="block">
            {row.permission.name}
          </Typography.Text>
        ) : (
          <span className="font-semibold">
            {getPermissionModuleLabel(row.module)}{' '}
            <span className="font-normal text-text-secondary">
              ({row.checkedCount}/{row.totalCount})
            </span>
          </span>
        ),
    },
    {
      title: 'Mã quyền',
      key: 'code',
      width: COLUMN_WIDTH.text,
      responsive: ['sm'],
      render: (_, row) =>
        row.permission ? (
          <Typography.Text ellipsis={{ tooltip: row.permission.code }} className="block font-mono text-sm text-text-secondary">
            {row.permission.code}
          </Typography.Text>
        ) : null,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          allowClear
          aria-label="Lọc quyền"
          prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
          placeholder="Tìm theo tên, mã quyền hoặc nhóm…"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="sm:max-w-80"
        />
        <Segmented<CheckedFilter> options={CHECKED_FILTER_OPTIONS} value={checkedFilter} onChange={setCheckedFilter} />
        <span className="text-sm text-text-secondary sm:ml-auto">
          Đã chọn {selectedIds.size}/{groups.reduce((total, group) => total + group.permissions.length, 0)} quyền
        </span>
      </div>

      <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
        <Table<PermissionRow>
          rowKey="key"
          size="small"
          bordered
          columns={columns}
          dataSource={rows}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
          className="[&_.ant-table-cell]:whitespace-nowrap"
          rowSelection={{
            selectedRowKeys,
            onChange: handleSelectionChange,
            getCheckboxProps: () => ({ disabled: isReadOnly }),
            columnWidth: 48,
          }}
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpand: (isExpanded, row) =>
              setCollapsedKeys((previous) =>
                isExpanded ? previous.filter((key) => key !== row.key) : [...previous, row.key],
              ),
          }}
          // Dòng nhóm nổi bật để dễ phân biệt khi danh sách dài
          rowClassName={(row) => (row.permission ? '' : 'bg-bg-layout')}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có quyền phù hợp" /> }}
        />
      </div>
    </div>
  );
};
