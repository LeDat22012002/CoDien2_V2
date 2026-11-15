namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>Tự tạo đơn vị báo cáo cho tổ/kíp đang hoạt động trên sơ đồ tổ chức (mặc định báo cáo theo sơ đồ).</summary>
public interface IWorkReportUnitSyncService
{
    /// <summary>
    /// Tạo đơn vị cho tổ (GROUP) / kíp (SHIFT) đang hoạt động chưa từng có đơn vị theo sơ đồ (kể cả đã xóa → bỏ qua),
    /// tên / tiền tố (tránh trùng trong xưởng) / HC-KIP theo gợi ý, xếp cuối xưởng. workshopId null = mọi xưởng.
    /// Không tạo form (người gọi tự SyncFormsAsync). Trả Id đơn vị vừa tạo.
    /// </summary>
    Task<IReadOnlyList<int>> EnsureFromOrgChartAsync(int? workshopId, CancellationToken cancellationToken);
}
