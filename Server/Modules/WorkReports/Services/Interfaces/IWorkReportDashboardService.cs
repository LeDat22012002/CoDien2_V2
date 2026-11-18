using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>Trang công khai: việc trong ngày và phân tích tuần của các xưởng công khai (gọi sau UsePublicViewAsync).</summary>
public interface IWorkReportDashboardService
{
    /// <summary>Dòng báo cáo có khoảng ngày làm phủ ngày date.</summary>
    Task<DailyWorkDto<WorkReportItemDto>> GetDailyReportAsync(DateOnly date, CancellationToken cancellationToken);

    /// <summary>Dòng kế hoạch có khoảng ngày làm phủ ngày date.</summary>
    Task<DailyWorkDto<WorkPlanItemDto>> GetDailyPlanAsync(DateOnly date, CancellationToken cancellationToken);

    /// <summary>Báo cáo tuần + kế hoạch tuần tới theo xưởng: giờ công KH/TT, %, phút theo đầu mục, vật tư.</summary>
    Task<WorkReportDashboardDto> GetDashboardAsync(WorkReportDashboardRequest request, CancellationToken cancellationToken);
}
