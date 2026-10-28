import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Tooltip } from 'antd';
import { USER_STATUS_FILTER_OPTIONS, type UserStatusFilter } from '@/modules/identity/constants/userOptions';
import type { Role } from '@/modules/identity/types/roles';

interface UserFilterBarProps {
  keyword: string;
  roleId?: number;
  status: UserStatusFilter;
  roles: Role[];
  isRolesLoading: boolean;
  isRefreshing: boolean;
  onKeywordChange: (keyword: string) => void;
  onRoleChange: (roleId?: number) => void;
  onStatusChange: (status: UserStatusFilter) => void;
  onRefresh: () => void;
}

/** Bộ lọc đầu trang: tìm kiếm, vai trò, trạng thái, tải lại. */
export const UserFilterBar = ({
  keyword,
  roleId,
  status,
  roles,
  isRolesLoading,
  isRefreshing,
  onKeywordChange,
  onRoleChange,
  onStatusChange,
  onRefresh,
}: UserFilterBarProps) => (
  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
    <Input
      allowClear
      aria-label="Tìm tài khoản"
      prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
      placeholder="Tìm mã NV, họ tên, email…"
      value={keyword}
      onChange={(event) => onKeywordChange(event.target.value)}
      className="w-full sm:w-72"
    />
    <Select
      allowClear
      showSearch={{ optionFilterProp: 'label' }}
      aria-label="Lọc theo vai trò"
      value={roleId}
      onChange={(value?: number) => onRoleChange(value)}
      options={roles.map((role) => ({ value: role.id, label: role.name }))}
      placeholder="Lọc theo vai trò"
      loading={isRolesLoading}
      className="w-full sm:w-56"
    />
    <div className="flex gap-2">
      <Select
        aria-label="Lọc theo trạng thái"
        value={status}
        onChange={onStatusChange}
        options={USER_STATUS_FILTER_OPTIONS}
        className="min-w-0 flex-1 sm:w-48 sm:flex-none"
      />
      <Tooltip title="Tải lại">
        <Button aria-label="Tải lại danh sách" icon={<ReloadOutlined />} onClick={onRefresh} loading={isRefreshing} />
      </Tooltip>
    </div>
  </div>
);
