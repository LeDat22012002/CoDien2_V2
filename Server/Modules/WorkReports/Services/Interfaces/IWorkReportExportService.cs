using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>Xuất Excel kế hoạch / báo cáo tuần theo xưởng, đúng form Excel các xưởng đang dùng.</summary>
public interface IWorkReportExportService
{
    /// <summary>
    /// Sheet TỔNG HỢP DỮ LIỆU, VẬT TƯ SỬ DỤNG và mỗi tổ/kíp 1 sheet (chỉ các tổ/kíp người gọi xem được).
    /// Kế hoạch: 12 cột; báo cáo: 18 cột.
    /// </summary>
    Task<WorkReportExportFile> ExportAsync(WorkReportExportRequest request, CancellationToken cancellationToken);
}