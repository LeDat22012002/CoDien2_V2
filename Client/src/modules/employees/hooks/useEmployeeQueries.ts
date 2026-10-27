import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateAssignments } from '@/shared/hooks/useOrgStructure';
import {
  createEmployee,
  getEmployeeById,
  getEmployees,
  updateEmployee,
} from '@/modules/employees/api/employeesApi';
import type { EmployeeFilter, UpdateEmployeeRequest } from '@/modules/employees/types/employees';

export const EMPLOYEE_QUERY_KEYS = {
  all: ['employees'] as const,
  list: (filter: EmployeeFilter) => ['employees', 'list', filter] as const,
  detail: (id: number) => ['employees', 'detail', id] as const,
};

/** Đổi trang / bộ lọc vẫn giữ dữ liệu cũ trong lúc tải để bảng không nháy rỗng. */
export const useEmployees = (filter: EmployeeFilter) =>
  useQuery({
    queryKey: EMPLOYEE_QUERY_KEYS.list(filter),
    queryFn: () => getEmployees(filter),
    placeholderData: keepPreviousData,
  });

/** Luôn tải lại khi mở modal để có dữ liệu và vị trí mới nhất. */
export const useEmployeeDetail = (id: number | undefined) =>
  useQuery({
    queryKey: EMPLOYEE_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => getEmployeeById(id ?? 0),
    enabled: id !== undefined,
    staleTime: 0,
  });

// Thêm / sửa nhân viên có thể đổi vị trí (vị trí ban đầu, nghỉ việc) → làm mới cả danh sách nhân viên và người trong đơn vị

export const useCreateEmployee = () => {
  const invalidate = useInvalidateAssignments();
  return useMutation({ mutationFn: createEmployee, onSuccess: invalidate });
};

export const useUpdateEmployee = () => {
  const invalidate = useInvalidateAssignments();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateEmployeeRequest }) => updateEmployee(id, request),
    onSuccess: invalidate,
  });
};
