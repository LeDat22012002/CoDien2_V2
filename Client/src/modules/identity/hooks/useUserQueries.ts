import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  deleteUser,
  getAvailableEmployees,
  getUsers,
  resetUserPassword,
  unlockUser,
  updateUser,
} from '@/modules/identity/api/usersApi';
import { ROLE_QUERY_KEYS } from '@/modules/identity/hooks/useRoleQueries';
import type { UpdateUserRequest, UserFilter } from '@/modules/identity/types/users';

export const USER_QUERY_KEYS = {
  all: ['users'] as const,
  list: (filter: UserFilter) => ['users', 'list', filter] as const,
  availableEmployees: (keyword: string) => ['users', 'available-employees', keyword] as const,
};

/** Đổi trang / bộ lọc vẫn giữ dữ liệu cũ trong lúc tải để bảng không nháy rỗng. */
export const useUsers = (filter: UserFilter) =>
  useQuery({
    queryKey: USER_QUERY_KEYS.list(filter),
    queryFn: () => getUsers(filter),
    placeholderData: keepPreviousData,
  });

export const useAvailableEmployees = (keyword: string, isEnabled: boolean) =>
  useQuery({
    queryKey: USER_QUERY_KEYS.availableEmployees(keyword),
    queryFn: () => getAvailableEmployees(keyword),
    enabled: isEnabled,
    staleTime: 0,
  });

/** Ghi tài khoản → làm mới danh sách tài khoản và số người của từng vai trò. */
const useInvalidateUsers = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEYS.all }),
    ]);
};

export const useCreateUser = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: createUser, onSuccess: invalidate });
};

export const useUpdateUser = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateUserRequest }) => updateUser(id, request),
    onSuccess: invalidate,
  });
};

export const useResetUserPassword = () =>
  useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => resetUserPassword(id, newPassword),
  });

export const useUnlockUser = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: unlockUser, onSuccess: invalidate });
};

export const useDeleteUser = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: deleteUser, onSuccess: invalidate });
};
