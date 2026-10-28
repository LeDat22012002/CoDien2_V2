import { PlusOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PERMISSION_CODES } from '@/shared/constants/permissionCodes';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { notify } from '@/shared/utils/notify';
import { useAuthStore, useHasPermission } from '@/stores/authStore';
import { ResetPasswordModal } from '@/modules/identity/components/ResetPasswordModal';
import { UserCreateModal } from '@/modules/identity/components/UserCreateModal';
import { UserEditModal } from '@/modules/identity/components/UserEditModal';
import { UserFilterBar } from '@/modules/identity/components/UserFilterBar';
import { UserTable, type UserRowAction } from '@/modules/identity/components/UserTable';
import {
  DEFAULT_USER_STATUS_FILTER,
  USER_PAGE_SIZE,
  USER_STATUS_FILTER_OPTIONS,
  type UserStatusFilter,
} from '@/modules/identity/constants/userOptions';
import { useRoles } from '@/modules/identity/hooks/useRoleQueries';
import { useDeleteUser, useUnlockUser, useUsers } from '@/modules/identity/hooks/useUserQueries';
import type { User, UserFilter } from '@/modules/identity/types/users';

const SEARCH_DEBOUNCE_MS = 500;

/** Tham số trên URL (?q=&role=&status=&page=&limit=) để F5 / quay lại không mất bộ lọc và trang. */
const PARAMS = {
  keyword: 'q',
  roleId: 'role',
  status: 'status',
  page: 'page',
  pageSize: 'limit',
} as const;

type ParamKey = keyof typeof PARAMS;

/** Trạng thái lọc → tham số API. */
const STATUS_TO_FILTER: Record<UserStatusFilter, Pick<UserFilter, 'isActive' | 'isLocked'>> = {
  ALL: {},
  ACTIVE: { isActive: true },
  INACTIVE: { isActive: false },
  LOCKED: { isLocked: true },
};

/** Modal đang mở cho 1 tài khoản. */
type RowDialog = { type: 'edit' | 'reset-password'; user: User } | null;

/**
 * Quản lý tài khoản (route /admin/users), dựng lại theo ManageTaiKhoan hệ thống cũ:
 * danh sách + lọc + phân trang, tạo tài khoản cho nhân viên, sửa vai trò / trạng thái / ảnh,
 * đặt lại mật khẩu, mở khóa, xóa. Ẩn/hiện nút theo quyền chỉ để hiển thị, Server kiểm tra thật.
 */
const UserListPage = () => {
  const { modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get(PARAMS.keyword) ?? '';
  const roleId = Number(searchParams.get(PARAMS.roleId)) || undefined;
  const status =
    USER_STATUS_FILTER_OPTIONS.find((option) => option.value === searchParams.get(PARAMS.status))?.value ??
    DEFAULT_USER_STATUS_FILTER;
  const pageIndex = Number(searchParams.get(PARAMS.page)) || 1;
  const pageSize = Number(searchParams.get(PARAMS.pageSize)) || USER_PAGE_SIZE;

  const currentUserId = useAuthStore((state) => state.user?.id);
  const canCreate = useHasPermission(PERMISSION_CODES.users.create);
  const canUpdate = useHasPermission(PERMISSION_CODES.users.update);
  const canResetPassword = useHasPermission(PERMISSION_CODES.users.resetPassword);
  const canDelete = useHasPermission(PERMISSION_CODES.users.delete);

  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rowDialog, setRowDialog] = useState<RowDialog>(null);

  const rolesQuery = useRoles();
  const roles = rolesQuery.data ?? [];
  const usersQuery = useUsers({
    keyword: keyword || undefined,
    roleId,
    ...STATUS_TO_FILTER[status],
    pageIndex,
    pageSize,
  });
  const unlockMutation = useUnlockUser();
  const deleteMutation = useDeleteUser();

  /** Ghi tham số lên URL; đổi bộ lọc thì về trang 1. */
  const updateParams = (patch: Partial<Record<ParamKey, string | number | undefined>>, resetPage = true) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          const param = PARAMS[key as ParamKey];
          if (value === undefined || value === '') next.delete(param);
          else next.set(param, String(value));
        });
        if (resetPage) next.delete(PARAMS.page);
        return next;
      },
      { replace: true },
    );

  // Ô tìm kiếm → URL (sau 500ms ngừng gõ)
  useEffect(() => {
    if (debouncedKeyword !== keyword) updateParams({ keyword: debouncedKeyword });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi người dùng ngừng gõ
  }, [debouncedKeyword]);

  const handlePageChange = (nextPage: number, nextPageSize: number) =>
    updateParams(
      {
        page: nextPage === 1 ? undefined : nextPage,
        pageSize: nextPageSize === USER_PAGE_SIZE ? undefined : nextPageSize,
      },
      nextPageSize !== pageSize,
    );

  const handleUnlock = async (user: User) => {
    try {
      await unlockMutation.mutateAsync(user.id);
      notify.success(`Đã mở khóa tài khoản ${user.fullName}.`);
    } catch (error) {
      notify.apiError(error);
    }
  };

  const confirmDelete = (user: User) =>
    modal.confirm({
      title: 'Xóa tài khoản?',
      content: `Tài khoản "${user.fullName}" (${user.empCode}) sẽ bị xóa và đăng xuất khỏi mọi thiết bị. Hồ sơ nhân viên vẫn giữ nguyên, có thể tạo lại tài khoản sau.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(user.id);
          notify.success('Đã xóa tài khoản.');
          // Xóa dòng cuối của trang cuối thì lùi 1 trang
          if (usersQuery.data?.items.length === 1 && pageIndex > 1) updateParams({ page: pageIndex - 1 }, false);
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const handleRowAction = (action: UserRowAction, user: User) => {
    if (action === 'unlock') void handleUnlock(user);
    else if (action === 'delete') confirmDelete(user);
    else setRowDialog({ type: action, user });
  };

  const closeRowDialog = () => setRowDialog(null);

  return (
    // Trang cao bằng phần còn lại của màn hình để khung bảng cố định, thân bảng cuộn bên trong
    <div className="flex h-[calc(100dvh-88px)] flex-col md:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Tài khoản người dùng"
        description="Tài khoản đăng nhập của nhân viên (tên đăng nhập = mã nhân viên), vai trò và trạng thái."
        extra={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
              Tạo tài khoản
            </Button>
          )
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container p-3 md:p-4">
        <UserFilterBar
          keyword={keywordInput}
          roleId={roleId}
          status={status}
          roles={roles}
          isRolesLoading={rolesQuery.isLoading}
          isRefreshing={usersQuery.isFetching}
          onKeywordChange={setKeywordInput}
          onRoleChange={(value) => updateParams({ roleId: value })}
          onStatusChange={(value) =>
            updateParams({ status: value === DEFAULT_USER_STATUS_FILTER ? undefined : value })
          }
          onRefresh={() => usersQuery.refetch()}
        />

        {usersQuery.isError && !usersQuery.data ? (
          <ErrorState error={usersQuery.error} onRetry={() => usersQuery.refetch()} />
        ) : (
          <UserTable
            users={usersQuery.data?.items ?? []}
            totalCount={usersQuery.data?.totalCount ?? 0}
            pageIndex={pageIndex}
            pageSize={pageSize}
            isLoading={usersQuery.isFetching}
            currentUserId={currentUserId}
            permissions={{ canUpdate, canResetPassword, canDelete }}
            onPageChange={handlePageChange}
            onAction={handleRowAction}
          />
        )}
      </div>

      <UserCreateModal open={isCreateOpen} roles={roles} onClose={() => setIsCreateOpen(false)} />
      <UserEditModal
        user={rowDialog?.type === 'edit' ? rowDialog.user : null}
        roles={roles}
        onClose={closeRowDialog}
      />
      <ResetPasswordModal
        user={rowDialog?.type === 'reset-password' ? rowDialog.user : null}
        onClose={closeRowDialog}
      />
    </div>
  );
};

export default UserListPage;
