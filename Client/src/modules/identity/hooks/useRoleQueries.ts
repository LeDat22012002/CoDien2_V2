import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRole,
  deleteRole,
  getPermissionGroups,
  getRoleById,
  getRoles,
  updatePermission,
  updateRole,
} from '@/modules/identity/api/rolesApi';
import type { UpdatePermissionRequest, UpdateRoleRequest } from '@/modules/identity/types/roles';

export const ROLE_QUERY_KEYS = {
  all: ['roles'] as const,
  list: () => ['roles', 'list'] as const,
  detail: (id: number) => ['roles', 'detail', id] as const,
  permissions: ['permissions'] as const,
};

export const useRoles = (isEnabled = true) =>
  useQuery({
    queryKey: ROLE_QUERY_KEYS.list(),
    queryFn: getRoles,
    enabled: isEnabled,
  });

export const useRoleDetail = (id: number | undefined) =>
  useQuery({
    queryKey: ROLE_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => getRoleById(id ?? 0),
    enabled: id !== undefined,
  });

/** Danh mục quyền ít đổi (chỉ đổi khi deploy code mới). */
export const usePermissionGroups = () =>
  useQuery({
    queryKey: ROLE_QUERY_KEYS.permissions,
    queryFn: getPermissionGroups,
    staleTime: 5 * 60 * 1000,
  });

/** Đổi vai trò → làm mới danh sách vai trò và danh sách tài khoản (cột vai trò). */
const useInvalidateRoles = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
    ]);
};

export const useCreateRole = () => {
  const invalidate = useInvalidateRoles();
  return useMutation({ mutationFn: createRole, onSuccess: invalidate });
};

export const useUpdateRole = () => {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateRoleRequest }) => updateRole(id, request),
    onSuccess: invalidate,
  });
};

export const useDeleteRole = () => {
  const invalidate = useInvalidateRoles();
  return useMutation({ mutationFn: deleteRole, onSuccess: invalidate });
};

export const useUpdatePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdatePermissionRequest }) => updatePermission(id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEYS.permissions }),
  });
};
