import type { Incident, IncidentScope } from '@/modules/incidents/types/incidents';

export interface IncidentRowPermissions {
  /** Sửa đầy đủ, xóa: quản lý báo cáo sự cố. */
  canManage: boolean;
  /** Mốc thời gian, mô tả, phương án: người nhập hoặc quản lý. */
  canUpdateProgress: boolean;
  /** Số order, link biên bản, link báo cáo sự cố: người nhập, người phân tích của xưởng đó hoặc quản lý. */
  canSupplement: boolean;
  /** Nguyên nhân, nguyên nhân gốc, hành động: người phân tích của xưởng đó hoặc quản lý. */
  canAnalyze: boolean;
}

/** Giống kiểm tra ở IncidentService (Server); chỉ để ẩn/hiện nút, Server mới kiểm tra thật. */
export const getIncidentRowPermissions = (incident: Incident, scope: IncidentScope): IncidentRowPermissions => {
  const isReporter =
    Boolean(incident.reporterEmpCode) && incident.reporterEmpCode?.toLowerCase() === scope.empCode.toLowerCase();
  const isOwnWorkshop =
    scope.canAnalyze && scope.workshopId !== null && scope.workshopId !== undefined &&
    incident.workshopId === scope.workshopId;

  return {
    canManage: scope.canManage,
    canUpdateProgress: isReporter || scope.canManage,
    canSupplement: isReporter || scope.canManage || isOwnWorkshop,
    canAnalyze: scope.canManage || isOwnWorkshop,
  };
};

export const hasAnyIncidentAction = (permissions: IncidentRowPermissions) =>
  permissions.canManage || permissions.canUpdateProgress || permissions.canSupplement || permissions.canAnalyze;
