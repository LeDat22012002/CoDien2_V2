/**
 * Kiểu dữ liệu cơ cấu tổ chức và chức vụ (API module Organization ở Server).
 * Dùng chung cho module employees (vị trí nhân viên) và organization (quản lý cơ cấu, cấp bậc).
 */

/** FACTORY | WORKSHOP | TEAM | SHIFT | SECTION | GROUP. */
export type OrgUnitTypeCode = 'FACTORY' | 'WORKSHOP' | 'TEAM' | 'SHIFT' | 'SECTION' | 'GROUP';

export interface OrgUnit {
  id: number;
  code: string;
  name: string;
  shortName?: string | null;
  typeCode: OrgUnitTypeCode;
  parentId?: number | null;
  /** Ghi đè cấp trưởng; null = theo loại đơn vị. */
  headLevelCode?: string | null;
  /** CK | DIEN | CD. */
  disciplineCode?: string | null;
  area?: string | null;
  /** Kíp A | B | C | D (Tổ thuộc Nhóm theo ca). */
  shift?: string | null;
  sortOrder: number;
  /** False = đã xóa (xóa mềm). */
  isActive: boolean;
  note?: string | null;
}

export interface OrgUnitType {
  code: OrgUnitTypeCode;
  name: string;
  headLevelCode: string;
  deputyLevelCode?: string | null;
  singleHead: boolean;
  /** Loại đơn vị cha hợp lệ; rỗng = loại gốc (Nhà máy). */
  allowedParentTypes: OrgUnitTypeCode[];
}

export type DisplayMode = 'CARD' | 'BLOCK';

export interface PositionLevel {
  code: string;
  name: string;
  /** Nhỏ = cấp cao. */
  rank: number;
  /** Hàng 1–6 trên sơ đồ. */
  chartRow: number;
  displayMode: DisplayMode;
  blockLabel?: string | null;
}

export interface LookupItem {
  code: string;
  name: string;
}

export interface OrgLookups {
  orgUnitTypes: OrgUnitType[];
  positionLevels: PositionLevel[];
  disciplines: LookupItem[];
}

export interface OrgUnitFilter {
  parentId?: number;
  typeCode?: OrgUnitTypeCode;
  /** True = gồm cả đơn vị đã xóa (để sinh mã không trùng). */
  includeInactive?: boolean;
}

export type UnitRole = 'HEAD' | 'DEPUTY' | 'MEMBER';

/** Người đang giữ vị trí trong 1 đơn vị. */
export interface UnitMember {
  assignmentId: number;
  employeeId: number;
  empCode: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  levelCode: string;
  levelName: string;
  unitRole: UnitRole;
  isActing: boolean;
  isPrimary: boolean;
  jobTitle?: string | null;
  startDate: string;
}

// ===== Chức vụ =====

/** Vị trí đang giữ trên sơ đồ tổ chức. */
export interface CurrentAssignment {
  assignmentId: number;
  employeeId: number;
  orgUnitId: number;
  orgUnitCode: string;
  orgUnitName: string;
  levelCode: string;
  levelName: string;
  jobTitle?: string | null;
  isActing: boolean;
  /** False = kiêm nhiệm. */
  isPrimary: boolean;
  /** Dạng YYYY-MM-DD. */
  startDate: string;
}

/** Nhân viên tối thiểu để điều chuyển / bổ nhiệm. */
export interface AssignableEmployee {
  id: number;
  empCode: string;
  fullName: string;
}

export type ChangeType = 'INIT' | 'APPOINT' | 'PROMOTE' | 'DEMOTE' | 'TRANSFER' | 'ACTING';

export interface AssignmentHistory {
  assignmentId: number;
  startDate: string;
  /** Null = đang giữ. */
  endDate?: string | null;
  changeType: ChangeType;
  decisionNo?: string | null;
  orgUnitCode: string;
  orgUnitName: string;
  levelName: string;
  jobTitle?: string | null;
  isActing: boolean;
  isPrimary: boolean;
}

export interface ChangeAssignmentRequest {
  empCode: string;
  newOrgUnitCode: string;
  newLevelCode: string;
  effectiveDate: string;
  changeType: Exclude<ChangeType, 'INIT'>;
  jobTitle?: string;
  isActing: boolean;
  decisionNo?: string;
  note?: string;
}

export interface EndAssignmentRequest {
  endDate: string;
  note?: string;
}
