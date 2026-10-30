import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { App, Button, Input, Select, Tooltip } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PERMISSION_CODES } from '@/shared/constants/permissionCodes';
import { notify } from '@/shared/utils/notify';
import { useAuthStore, useHasPermission } from '@/stores/authStore';
import { RoleFormModal } from '@/modules/identity/components/RoleFormModal';
import { RoleTable, type RoleRowAction } from '@/modules/identity/components/RoleTable';
import { PERMISSION_ASSIGNMENT_PATH, normalizeSearchText } from '@/modules/identity/constants/roleOptions';
import { useRefreshProfile } from '@/modules/identity/hooks/useRefreshProfile';
import { useDeleteRole, useRoles } from '@/modules/identity/hooks/useRoleQueries';
import type { Role } from '@/modules/identity/types/roles';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng' },
];

interface FormModalState {
  open: boolean;
  roleId?: number;
}

/**
 * Vai trò (route /admin/roles): thêm / sửa / xóa vai trò. Gán quyền cho vai trò ở trang Phân quyền
 * (nút khiên trên từng dòng).
 */
const RoleListPage = () => {
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const canManage = useHasPermission(PERMISSION_CODES.roles.manage);
  const myRoles = useAuthStore((state) => state.roles);
  const refreshProfile = useRefreshProfile();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [formModal, setFormModal] = useState<FormModalState>({ open: false });

  const rolesQuery = useRoles();
  const deleteMutation = useDeleteRole();

  const normalizedKeyword = normalizeSearchText(keyword);
  const roles = (rolesQuery.data ?? []).filter(
    (role) =>
      (status === 'ALL' || role.isActive === (status === 'ACTIVE')) &&
      (!normalizedKeyword ||
        normalizeSearchText(`${role.name} ${role.code} ${role.description ?? ''}`).includes(normalizedKeyword)),
  );

  const goToPermissions = (roleId: number) => navigate(`${PERMISSION_ASSIGNMENT_PATH}?role=${roleId}`);

  const confirmDelete = (role: Role) =>
    modal.confirm({
      title: 'Xóa vai trò?',
      content: `Vai trò "${role.name}" (${role.code}) sẽ bị xóa cùng toàn bộ phân quyền của nó.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(role.id);
          notify.success('Đã xóa vai trò.');
          if (myRoles.some((item) => item.id === role.id)) await refreshProfile();
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const handleAction = (action: RoleRowAction, role: Role) => {
    if (action === 'permissions') goToPermissions(role.id);
    else if (action === 'edit') setFormModal({ open: true, roleId: role.id });
    else confirmDelete(role);
  };

  const handleCreated = (role: Role) =>
    modal.confirm({
      title: 'Phân quyền cho vai trò mới?',
      content: `Vai trò "${role.name}" chưa có quyền nào. Chuyển sang trang Phân quyền để chọn quyền ngay?`,
      okText: 'Phân quyền ngay',
      cancelText: 'Để sau',
      onOk: () => goToPermissions(role.id),
    });

  return (
    // Trang cao bằng phần còn lại của màn hình để khung bảng cố định, thân bảng cuộn bên trong
    <div className="flex h-[calc(100dvh-88px)] flex-col md:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Vai trò"
        description="Mỗi tài khoản có một hoặc nhiều vai trò; quyền của các vai trò được cộng dồn."
        extra={
          canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormModal({ open: true })}>
              Thêm vai trò
            </Button>
          )
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            allowClear
            aria-label="Tìm vai trò"
            prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
            placeholder="Tìm tên, mã hoặc mô tả…"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="w-full sm:w-72"
          />
          <div className="flex gap-2">
            <Select
              aria-label="Lọc theo trạng thái"
              value={status}
              onChange={setStatus}
              options={STATUS_FILTER_OPTIONS}
              className="min-w-0 flex-1 sm:w-44 sm:flex-none"
            />
            <Tooltip title="Tải lại">
              <Button
                aria-label="Tải lại danh sách"
                icon={<ReloadOutlined />}
                onClick={() => rolesQuery.refetch()}
                loading={rolesQuery.isFetching}
              />
            </Tooltip>
          </div>
          <span className="text-sm text-text-secondary sm:ml-auto">{roles.length} vai trò</span>
        </div>

        {rolesQuery.isError && !rolesQuery.data ? (
          <ErrorState error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />
        ) : (
          <RoleTable
            roles={roles}
            isLoading={rolesQuery.isFetching}
            canManage={canManage}
            onAction={handleAction}
          />
        )}
      </div>

      <RoleFormModal
        open={formModal.open}
        roleId={formModal.roleId}
        onClose={() => setFormModal((previous) => ({ ...previous, open: false }))}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default RoleListPage;
