import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty, Grid, Spin } from 'antd';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PERMISSION_CODES } from '@/shared/constants/permissionCodes';
import { notify } from '@/shared/utils/notify';
import { useAuthStore, useHasPermission } from '@/stores/authStore';
import { RoleCreateModal } from '@/modules/identity/components/RoleCreateModal';
import { RoleDetailPanel } from '@/modules/identity/components/RoleDetailPanel';
import { RoleListPanel } from '@/modules/identity/components/RoleListPanel';
import { useRefreshProfile } from '@/modules/identity/hooks/useRefreshProfile';
import {
  useDeleteRole,
  usePermissionGroups,
  useRoleDetail,
  useRoles,
} from '@/modules/identity/hooks/useRoleQueries';
import type { Role } from '@/modules/identity/types/roles';

const ROLE_PARAM = 'role';

/**
 * Vai trò và phân quyền (route /admin/roles): danh sách vai trò (trái) + thông tin và bảng quyền
 * của vai trò đang chọn (phải). Vai trò đang chọn lưu trên URL (?role=id).
 */
const RoleManagementPage = () => {
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailRef = useRef<HTMLDivElement>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const canManage = useHasPermission(PERMISSION_CODES.roles.manage);
  const myRoles = useAuthStore((state) => state.roles);
  const refreshProfile = useRefreshProfile();

  const rolesQuery = useRoles();
  const permissionsQuery = usePermissionGroups();
  const deleteMutation = useDeleteRole();
  const roles = rolesQuery.data ?? [];

  // Chưa chọn (hoặc chọn vai trò đã xóa) → vai trò đầu tiên
  const paramId = Number(searchParams.get(ROLE_PARAM)) || undefined;
  const selectedId = roles.some((role) => role.id === paramId) ? paramId : roles[0]?.id;
  const detailQuery = useRoleDetail(selectedId);
  const detail = detailQuery.data?.id === selectedId ? detailQuery.data : undefined;

  const isMyRole = (roleId: number) => myRoles.some((role) => role.id === roleId);

  const selectRole = (roleId: number) => {
    setSearchParams({ [ROLE_PARAM]: String(roleId) }, { replace: true });
    // Điện thoại: khung chi tiết nằm dưới danh sách → cuộn xuống
    if (!screens.lg) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReload = () => {
    void rolesQuery.refetch();
    void permissionsQuery.refetch();
    if (selectedId) void detailQuery.refetch();
  };

  const handleDelete = (role: Role) =>
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
          setSearchParams({}, { replace: true });
          if (isMyRole(role.id)) await refreshProfile();
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const renderDetail = () => {
    if (rolesQuery.isError) return <ErrorState error={rolesQuery.error} onRetry={handleReload} />;
    if (!rolesQuery.isPending && roles.length === 0) {
      return <Empty description="Chưa có vai trò nào. Bấm “Thêm vai trò” để tạo." />;
    }
    if (detailQuery.isError) return <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} />;
    if (permissionsQuery.isError) {
      return <ErrorState error={permissionsQuery.error} onRetry={() => permissionsQuery.refetch()} />;
    }
    if (!detail || !permissionsQuery.data) {
      return (
        <div className="flex justify-center py-12">
          <Spin description="Đang tải…" />
        </div>
      );
    }
    return (
      <RoleDetailPanel
        key={detail.id}
        role={detail}
        permissionGroups={permissionsQuery.data}
        canManage={canManage}
        isDeleting={deleteMutation.isPending}
        onSaved={(saved) => {
          if (isMyRole(saved.id)) void refreshProfile();
        }}
        onDelete={() => handleDelete(detail)}
      />
    );
  };

  return (
    // Desktop: trang cao bằng phần còn lại của màn hình, danh sách và chi tiết cuộn riêng
    <div className="flex flex-col lg:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Vai trò và phân quyền"
        description="Mỗi tài khoản có một hoặc nhiều vai trò; quyền của các vai trò được cộng dồn. Lưu xong có hiệu lực ngay."
        extra={
          <div className="flex gap-2">
            <Button icon={<ReloadOutlined />} onClick={handleReload} loading={rolesQuery.isFetching}>
              Tải lại
            </Button>
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
                Thêm vai trò
              </Button>
            )}
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <Card
          size="small"
          title={`Vai trò (${roles.length})`}
          className="flex min-h-0 flex-col"
          styles={{ body: { padding: 8, flex: 1, minHeight: 0 } }}
        >
          <div className="max-h-[50dvh] lg:h-full lg:max-h-none">
            <RoleListPanel
              roles={roles}
              selectedId={selectedId}
              isLoading={rolesQuery.isPending}
              onSelect={selectRole}
            />
          </div>
        </Card>

        <Card
          size="small"
          ref={detailRef}
          className="flex min-h-0 scroll-mt-4 flex-col"
          styles={{ body: { flex: 1, minHeight: 0 } }}
        >
          {renderDetail()}
        </Card>
      </div>

      <RoleCreateModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(role) => selectRole(role.id)}
      />
    </div>
  );
};

export default RoleManagementPage;
