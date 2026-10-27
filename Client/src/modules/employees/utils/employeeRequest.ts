import type { Employee, EmployeeStatus, UpdateEmployeeRequest } from '@/modules/employees/types/employees';

/** PUT cần đủ trường: dựng request từ dữ liệu hiện có, chỉ đổi trạng thái (cho nghỉ việc). */
export const buildStatusChangeRequest = (employee: Employee, status: EmployeeStatus): UpdateEmployeeRequest => ({
  empCode: employee.empCode,
  fullName: employee.fullName,
  birthDate: employee.birthDate ?? undefined,
  educationLevel: employee.educationLevel ?? undefined,
  major: employee.major ?? undefined,
  gender: employee.gender ?? undefined,
  email: employee.email ?? undefined,
  phone: employee.phone ?? undefined,
  avatarUrl: employee.avatarUrl ?? undefined,
  status,
});
