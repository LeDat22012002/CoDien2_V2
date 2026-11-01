import type { PagedRequest } from '@/shared/types/api';

// ===== Báo cáo sự cố =====

export interface Incident {
  id: number;
  workshopId?: number | null;
  workshopName?: string | null;
  shift: string;
  equipmentCode: string;
  /** Tên thiết bị theo danh mục. */
  equipmentName: string;
  /** Tên sự cố (người nhập điền). */
  deviceName?: string | null;
  receivedAt?: string | null;
  repairStartedAt?: string | null;
  repairFinishedAt?: string | null;
  handedOverAt?: string | null;
  incidentType: string;
  stopLevel: string;
  affectsProduction: boolean;
  description?: string | null;
  solution?: string | null;
  /** Kết quả thực hiện (%). */
  result?: number | null;
  note?: string | null;
  cause?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  /** Thời điểm nhập qua phần mềm; null với dữ liệu import Excel. */
  reportedAt?: string | null;
  reporterEmpCode?: string | null;
  reporterName?: string | null;
  orderNumber?: string | null;
  reportLink?: string | null;
  waitingMinutes?: number | null;
  repairMinutes?: number | null;
  downtimeMinutes?: number | null;
}

/** FromDate/ToDate (YYYY-MM-DD) theo thời điểm nhận thông tin. */
export interface IncidentFilter extends PagedRequest {
  workshopId?: number;
  shift?: string;
  equipmentCode?: string;
  incidentType?: string;
  stopLevel?: string;
  affectsProduction?: boolean;
  fromDate?: string;
  toDate?: string;
  /** Chỉ báo cáo do người đang đăng nhập nhập. */
  onlyMine?: boolean;
}

/** Thời điểm gửi dạng giờ địa phương không kèm múi giờ (YYYY-MM-DDTHH:mm:ss), như hệ thống cũ. */
export interface CreateIncidentRequest {
  workshopId?: number;
  shift: string;
  equipmentCode: string;
  equipmentName: string;
  deviceName?: string;
  receivedAt?: string;
  repairStartedAt?: string;
  repairFinishedAt?: string;
  handedOverAt?: string;
  incidentType: string;
  stopLevel: string;
  affectsProduction: boolean;
  description?: string;
  solution?: string;
  result?: number;
  note?: string;
  orderNumber?: string;
  reportLink?: string;
}

/** Sửa đầy đủ (quyền incidents.manage): cùng trường với thêm mới. */
export type UpdateIncidentRequest = CreateIncidentRequest;

/** Người nhập cập nhật tiến độ: các mốc thời gian, mô tả, phương án xử lý. */
export interface UpdateIncidentProgressRequest {
  receivedAt?: string;
  repairStartedAt?: string;
  repairFinishedAt?: string;
  handedOverAt?: string;
  description?: string;
  solution?: string;
}

/** Bổ sung thông tin sau xử lý. */
export interface UpdateIncidentSupplementRequest {
  orderNumber?: string;
  reportLink?: string;
}

/** Phân tích kỹ thuật sau xử lý. */
export interface UpdateIncidentAnalysisRequest {
  cause?: string;
  rootCause?: string;
  correctiveAction?: string;
}

/** Quyền báo cáo sự cố của người đang đăng nhập (GET /incidents/my-scope). */
export interface IncidentScope {
  empCode: string;
  canManage: boolean;
  canAnalyze: boolean;
  /** Xưởng của vị trí chính; null = không thuộc xưởng nào. */
  workshopId?: number | null;
  workshopName?: string | null;
}

// ===== Dashboard =====

/** Year bỏ trống = năm hiện tại; workshopId bỏ trống = toàn nhà máy. */
export interface IncidentDashboardFilter {
  year?: number;
  workshopId?: number;
}

/** Thống kê theo nhóm (loại sự cố, kíp, dừng đến cấp); percent trên tổng số báo cáo. */
export interface GroupStatistic {
  name: string;
  count: number;
  percent: number;
}

export interface WorkshopStatistic {
  workshopId?: number | null;
  workshopName?: string | null;
  count: number;
  percent: number;
  overdueCount: number;
  analysisOverdueCount: number;
  supplementOverdueCount: number;
  /** % quá hạn trên số sự cố của chính xưởng. */
  overduePercent: number;
  /** % quá hạn của xưởng trên tổng số báo cáo quá hạn. */
  overdueShareOfTotal: number;
}

/** Thống kê 1 năm theo thời điểm nhập (dữ liệu import Excel không tính). */
export interface IncidentDashboard {
  year: number;
  workshopId?: number | null;
  workshopName?: string | null;
  totalCount: number;
  overdueCount: number;
  overduePercent: number;
  analysisOverdueCount: number;
  supplementOverdueCount: number;
  repeatedEquipmentCount: number;
  /** Số lần phải VƯỢT để coi là lặp lại. */
  repeatThreshold: number;
  byIncidentType: GroupStatistic[];
  byShift: GroupStatistic[];
  byStopLevel: GroupStatistic[];
  productionImpact: {
    affectedCount: number;
    affectedPercent: number;
    notAffectedCount: number;
    notAffectedPercent: number;
  };
  /** Chỉ có khi xem toàn nhà máy. */
  byWorkshop: WorkshopStatistic[];
}

export interface RepeatedEquipment {
  equipmentCode: string;
  equipmentName?: string | null;
  deviceName?: string | null;
  workshopId?: number | null;
  workshopName?: string | null;
  count: number;
  lastReportedAt?: string | null;
}

// ===== Danh mục =====

export interface IncidentWorkshop {
  id: number;
  name: string;
}

export interface EquipmentOption {
  id: number;
  code: string;
  name?: string | null;
}
