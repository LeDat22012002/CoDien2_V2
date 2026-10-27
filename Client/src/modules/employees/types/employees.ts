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

export interface CreateEmployeeRequest extends EmployeeRequestBase {
  initialAssignment?: InitialAssignmentRequest;
}

/** Server yêu cầu gửi đủ các trường; chuyển ACTIVE → INACTIVE thì Server tự kết thúc mọi vị trí đang giữ. */
export interface UpdateEmployeeRequest extends EmployeeRequestBase {
  status: EmployeeStatus;
}
