/** Dữ liệu GET /api/org-chart (công khai). */

export interface OrgChartPerson {
  assignmentId: number;
  employeeId: number;
  empCode: string;
  fullName: string;
  levelCode: string;
  levelName: string;
  isActing: boolean;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  startDate: string;
}

export interface OrgChartGroup {
  orgUnitId: number;
  code: string;
  name: string;
  shift?: string | null;
  /** Rỗng = chưa có Tổ trưởng. */
  leaders: OrgChartPerson[];
}

/** Khối gộp dưới 1 đơn vị: theo cấp bậc (LEVEL → people) hoặc gộp các Tổ (GROUPS → groups). */
export interface OrgChartBlock {
  key: string;
  kind: 'LEVEL' | 'GROUPS';
  label: string;
  levelCode: string;
  row: number;
  peopleCount: number;
  groupCount: number;
  people: OrgChartPerson[];
  groups: OrgChartGroup[];
}

/** 1 đơn vị trên sơ đồ; Tổ không là node riêng mà nằm trong khối GROUPS của đơn vị cha. */
export interface OrgChartNode {
  orgUnitId: number;
  code: string;
  name: string;
  shortName?: string | null;
  typeCode: string;
  typeName: string;
  parentId?: number | null;
  row: number;
  deputyRow?: number | null;
  displayMode: string;
  headLevelCode: string;
  headLevelName: string;
  deputyLevelName?: string | null;
  disciplineCode?: string | null;
  sortOrder: number;
  /** Quân số cả nhánh (gồm cả Tổ). */
  totalHeadcount: number;
  heads: OrgChartPerson[];
  deputies: OrgChartPerson[];
  blocks: OrgChartBlock[];
  children: OrgChartNode[];
}

export interface OrgChartTree {
  root?: OrgChartNode | null;
  totalEmployees: number;
  totalWorkshops: number;
  totalTeams: number;
  totalGroups: number;
  vacantHeadCount: number;
  maxRow: number;
}

// ===== Bố cục đã tính (tọa độ px) =====

export interface ChartBoxStyle {
  bg: string;
  border: string;
  text: string;
  line: string;
}

/** 1 ô trên sơ đồ: đơn vị, khối người, hoặc 1 người (Giám đốc / Phó Giám đốc). */
export interface ChartBox {
  id: string;
  kind: 'UNIT' | 'BLOCK' | 'PERSON';
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  style: ChartBoxStyle;
  /** Chuỗi đã bỏ dấu để tìm kiếm. */
  searchText: string;
  unit: OrgChartNode;
  block?: OrgChartBlock;
  /** Ô PERSON: null = chưa bổ nhiệm. */
  person?: OrgChartPerson | null;
  levelName?: string | null;
}

export interface ChartEdge {
  points: [number, number][];
  color: string;
  /** Có mũi tên ở điểm cuối. */
  arrow: boolean;
}

export interface ChartLayout {
  width: number;
  height: number;
  boxes: ChartBox[];
  edges: ChartEdge[];
}

/** Nội dung Drawer khi bấm vào 1 ô. */
export type MembersDrawerTarget =
  | { type: 'unit'; unit: OrgChartNode }
  | { type: 'block'; block: OrgChartBlock; unit: OrgChartNode };
