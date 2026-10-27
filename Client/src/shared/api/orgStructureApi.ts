import { httpGet, httpPost } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type {
  AssignableEmployee,
  AssignmentHistory,
  ChangeAssignmentRequest,
  CurrentAssignment,
  EndAssignmentRequest,
  OrgLookups,
  OrgUnit,
  OrgUnitFilter,
  UnitMember,
} from '@/shared/types/organization';

/**
 * API cơ cấu tổ chức và chức vụ dùng chung nhiều module (nhân viên, cơ cấu tổ chức).
 * Thao tác riêng của từng module (thêm/sửa đơn vị, cấp bậc, thêm/sửa nhân viên) đặt trong api của module đó.
 */

// ===== Danh mục =====

export const getOrgUnits = (filter?: OrgUnitFilter) => httpGet<OrgUnit[]>('/org-units', filter);

/** Loại đơn vị (kèm loại cha hợp lệ), cấp bậc, chuyên môn. */
export const getOrgLookups = () => httpGet<OrgLookups>('/org-chart/lookups');

/** Người đang giữ vị trí trong đơn vị. */
export const getUnitMembers = (orgUnitId: number) => httpGet<UnitMember[]>(`/org-chart/units/${orgUnitId}/members`);

// ===== Nhân viên (cho ô chọn nhân viên khi bổ nhiệm) =====

interface EmployeeWithAssignments extends AssignableEmployee {
  currentAssignments?: CurrentAssignment[];
}

/** Nhân viên đang làm việc theo mã / họ tên, tối đa 20 người. */
export const searchActiveEmployees = (keyword: string) =>
  httpGet<PagedResult<EmployeeWithAssignments>>('/employees', {
    keyword: keyword || undefined,
    status: 'ACTIVE',
    pageIndex: 1,
    pageSize: 20,
  });

/** Vị trí đang giữ của 1 nhân viên (vị trí chính đứng đầu). */
export const getEmployeeAssignments = async (employeeId: number) =>
  (await httpGet<EmployeeWithAssignments>(`/employees/${employeeId}`)).currentAssignments ?? [];

// ===== Chức vụ =====

/** Bổ nhiệm / lên cấp / xuống cấp / điều chuyển / giao quyền. */
export const changeAssignment = (request: ChangeAssignmentRequest) => httpPost<null>('/assignments/change', request);

/** Thôi giữ 1 vị trí. */
export const endAssignment = (assignmentId: number, request: EndAssignmentRequest) =>
  httpPost<null>(`/assignments/${assignmentId}/end`, request);

/** Lịch sử công tác, mới nhất trước. */
export const getAssignmentHistory = (empCode: string) =>
  httpGet<AssignmentHistory[]>(`/assignments/history/${encodeURIComponent(empCode)}`);
