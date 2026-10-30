import { ReloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty, Grid, Spin } from 'antd';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PERMISSION_CODES } from '@/shared/constants/permissionCodes';
import { useAuthStore, useHasPermission } from '@/stores/authStore';
import { RoleListPanel } from '@/modules/identity/components/RoleListPanel';
import { RolePermissionPanel } from '@/modules/identity/components/RolePermissionPanel';
import { useRefreshProfile } from '@/modules/identity/hooks/useRefreshProfile';
import { usePermissionGroups, useRoleDetail, useRoles } from '@/modules/identity/hooks/useRoleQueries';

const ROLE_PARAM = 'role';

/**
 * Phân quyền (route /admin/permissions): chọn vai trò (trái), tick quyền cho vai trò đó (phải).
 * Thêm / sửa / xóa vai trò ở trang Vai trò. Vai trò đang chọn lưu trên URL (?role=id).
 */
const PermissionAssignmentPage = () => {
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailRef = useRef<HTMLDivElement>(null);
  const [isDirty, setIsDirty] = useState(false);

  const canManage = useHasPermission(PERMISSION_CODES.roles.manage);
  const myRoles = useAuthStore((state) => state.roles);
  const refreshProfile = useRefreshProfile();

  const rolesQuery = useRoles();
  const permissionsQuery = usePermissionGroups();
  const roles = rolesQuery.data ?? [];

  // Chưa chọn (hoặc chọn vai trò đã xóa) → vai trò đầu tiên
  const paramId = Number(searchParams.get(ROLE_PARAM)) || undefined;
  const selectedId = roles.some((role) => role.id === paramId) ? paramId : roles[0]?.id;
  const detailQuery = useRoleDetail(selectedId);
  const detail = detailQuery.data?.id === selectedId ? detailQuery.data : undefined;

  const doSelect = (roleId: number) => {
    setIsDirty(false);
    setSearchParams({ [ROLE_PARAM]: String(roleId) }, { replace: true });
    // Điện thoại: khung phân quyền nằm dưới danh sách → cuộn xuống
    if (!screens.lg) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectRole = (roleId: number) => {
    if (roleId === selectedId) return;
    if (!isDirty) {
      doSelect(roleId);
      return;
    }
    modal.confirm({
      title: 'Bỏ thay đổi chưa lưu?',
      content: 'Phân quyền của vai trò đang chọn có thay đổi chưa lưu. Chuyển vai trò sẽ mất các thay đổi này.',
      okText: 'Bỏ thay đổi',
      okButtonProps: { danger: true },
      cancelText: 'Ở lại',
      onOk: () => doSelect(roleId),
    });
  };

  const handleReload = () => {
    void rolesQuery.refetch();
    void permissionsQuery.refetch();
  };

  const renderDetail = () => {
    if (rolesQuery.isError) return <ErrorState error={rolesQuery.error} onRetry={handleReload} />;
    if (!rolesQuery.isPending && roles.length === 0) {
      return (
        <Empty description="Chưa có vai trò nào.">
          <Link to="/admin/roles">
            <Button type="primary">Thêm vai trò</Button>
          </Link>
        </Empty>
      );
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
      <RolePermissionPanel
        key={detail.id}
        role={detail}
        permissionGroups={permissionsQuery.data}
        canManage={canManage}
        onDirtyChange={setIsDirty}
        onSaved={(saved) => {
          // Đổi quyền của vai trò mình đang giữ → menu, nút ẩn/hiện cập nhật ngay
          if (myRoles.some((role) => role.id === saved.id)) void refreshProfile();
        }}
      />
    );
  };

  return (
    // Desktop: trang cao bằng phần còn lại của màn hình, danh sách và bảng quyền cuộn riêng
    <div className="flex flex-col lg:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Phân quyền"
        description="Chọn vai trò rồi tick các quyền được phép. Lưu xong có hiệu lực ngay với mọi tài khoản giữ vai trò."
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={rolesQuery.isFetching}>
            Tải lại
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <Card
          size="small"
          title={`Vai trò (${roles.length})`}
          className="flex min-h-0 flex-col"
          styles={{ body: { padding: 8, flex: 1, minHeight: 0 } }}
        >
          <div className="max-h-[40dvh] lg:h-full lg:max-h-none">
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
    </div>
  );
};

export default PermissionAssignmentPage;
