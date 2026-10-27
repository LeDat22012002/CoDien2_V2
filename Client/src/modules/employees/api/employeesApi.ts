import { httpGet, httpPost, httpPut } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type {
  CreateEmployeeRequest,
  Employee,
  EmployeeFilter,
  UpdateEmployeeRequest,
} from '@/modules/employees/types/employees';

/** Danh sách nhân viên kèm vị trí đang giữ; keyword tìm theo mã, họ tên, email, số điện thoại. */
export const getEmployees = (filter: EmployeeFilter) => httpGet<PagedResult<Employee>>('/employees', filter);

export const getEmployeeById = (id: number) => httpGet<Employee>(`/employees/${id}`);

/** Nhân viên mới luôn ở trạng thái ACTIVE; có initialAssignment thì bổ nhiệm luôn vị trí ban đầu. */
export const createEmployee = (request: CreateEmployeeRequest) => httpPost<Employee>('/employees', request);

export const updateEmployee = (id: number, request: UpdateEmployeeRequest) =>
  httpPut<Employee>(`/employees/${id}`, request);
