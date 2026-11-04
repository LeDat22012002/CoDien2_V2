import type { PagedRequest } from '@/shared/types/api';
import type { CurrentAssignment } from '@/shared/types/organization';

/** Giá trị lưu nguyên văn như cột dbo.Employee (Server/Modules/Employees/Entities/Employee.cs). */
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type Gender = 'Nam' | 'Nữ';
export type EducationLevel = 'ĐH' | 'CĐ' | 'TC' | 'SC' | 'CNKT';

export interface Employee {
  id: number;
  empCode: string;
  fullName: string;
  /** Dạng YYYY-MM-DD. */
  birthDate?: string | null;
  educationLevel?: EducationLevel | null;
  major?: string | null;
  gender?: Gender | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
  /** Vị trí chính đứng đầu; rỗng = chưa xếp vị trí. */
  currentAssignments: CurrentAssignment[];
  /** Không hiện trên sơ đồ tổ chức (vẫn thuộc đơn vị theo vị trí đang giữ). */
  isHiddenOnOrgChart: boolean;
  /** Xưởng (đơn vị cấp 1; Ban Giám đốc: tên Nhà máy). Chỉ có khi lấy chi tiết 1 nhân viên. */
  workshopName?: string | null;
}

export interface EmployeeFilter extends PagedRequest {
  status?: EmployeeStatus;
  /** Nhân viên đang giữ vị trí ở đơn vị này hoặc đơn vị con cháu. */
  orgUnitId?: number;
}

/** Vị trí ban đầu khi tạo nhân viên (bổ nhiệm, hiệu lực từ hôm nay). */
export interface InitialAssignmentRequest {
  orgUnitCode: string;
  levelCode: string;
  jobTitle?: string;
  isActing: boolean;
  decisionNo?: string;
  note?: string;
  /** Vẫn giữ vị trí và thuộc đơn vị, nhưng không hiện trên sơ đồ tổ chức. */
  isHiddenOnOrgChart: boolean;
}

interface EmployeeRequestBase {
  empCode: string;
  fullName: string;
  birthDate?: string;
  educationLevel?: EducationLevel;
  major?: string;
  gender?: Gender;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

/** Vị trí ban đầu bắt buộc (đơn vị của vị trí xác định nhân viên thuộc xưởng nào), cần quyền assignments.manage. */
export interface CreateEmployeeRequest extends EmployeeRequestBase {
  initialAssignment: InitialAssignmentRequest;
}

/** Server yêu cầu gửi đủ các trường; chuyển ACTIVE → INACTIVE thì Server tự kết thúc mọi vị trí đang giữ. */
export interface UpdateEmployeeRequest extends EmployeeRequestBase {
  status: EmployeeStatus;
  /** Bỏ trống = giữ nguyên; đổi giá trị cần quyền assignments.manage. */
  isHiddenOnOrgChart?: boolean;
}
