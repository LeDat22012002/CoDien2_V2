import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Tooltip, TreeSelect } from 'antd';
import { useMemo } from 'react';
import type { OrgUnit } from '@/shared/types/organization';
import { buildUnitTree, renderUnitTreeTitle } from '@/shared/utils/orgUnitTree';
import { STATUS_FILTER_OPTIONS, type EmployeeStatusFilter } from '@/modules/employees/constants/employeeOptions';

interface EmployeeFilterBarProps {
  keyword: string;
  orgUnitId?: number;
  status: EmployeeStatusFilter;
  units: OrgUnit[];
  isUnitsLoading: boolean;
  isRefreshing: boolean;
  onKeywordChange: (keyword: string) => void;
  onOrgUnitChange: (orgUnitId?: number) => void;
  onStatusChange: (status: EmployeeStatusFilter) => void;
  onRefresh: () => void;
}

/** Bộ lọc đầu trang: tìm kiếm, đơn vị (gồm cả đơn vị con), trạng thái, tải lại. */
export const EmployeeFilterBar = ({
  keyword,
  orgUnitId,
  status,
  units,
  isUnitsLoading,
  isRefreshing,
  onKeywordChange,
  onOrgUnitChange,
  onStatusChange,
  onRefresh,
}: EmployeeFilterBarProps) => {
  const unitTree = useMemo(() => buildUnitTree(units, 'id'), [units]);

  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        allowClear
        aria-label="Tìm nhân viên"
        prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
        placeholder="Tìm mã NV, họ tên, email…"
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        className="w-full sm:w-72"
      />
      <TreeSelect
        allowClear
        showSearch
        aria-label="Lọc theo đơn vị"
        value={orgUnitId}
        onChange={(value?: number) => onOrgUnitChange(value)}
        treeData={unitTree}
        treeNodeFilterProp="searchText"
        treeDefaultExpandedKeys={unitTree.map((node) => node.value)}
        placeholder="Lọc theo đơn vị"
        loading={isUnitsLoading}
        listHeight={380}
        treeTitleRender={renderUnitTreeTitle}
        className="w-full sm:w-72"
      />
      <div className="flex gap-2">
        <Select
          aria-label="Lọc theo trạng thái"
          value={status}
          onChange={onStatusChange}
          options={STATUS_FILTER_OPTIONS}
          className="min-w-0 flex-1 sm:w-40 sm:flex-none"
        />
        <Tooltip title="Tải lại">
          <Button aria-label="Tải lại danh sách" icon={<ReloadOutlined />} onClick={onRefresh} loading={isRefreshing} />
        </Tooltip>
      </div>
    </div>
  );
};
