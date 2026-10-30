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
