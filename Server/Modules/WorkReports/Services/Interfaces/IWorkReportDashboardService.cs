using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>Trang công khai: việc trong ngày và phân tích tuần của các xưởng công khai (gọi sau UsePublicViewAsync).</summary>
public interface IWorkReportDashboardService
{
    /// <summary>Lưới báo cáo từng xưởng, chỉ dòng có khoảng ngày làm phủ ngày date.</summary>
    Task<DailyWorkDto<WeeklyReportFormDto>> GetDailyReportAsync(DateOnly date, CancellationToken cancellationToken);

    /// <summary>Lưới kế hoạch từng xưởng, chỉ dòng có khoảng ngày làm phủ ngày date.</summary>
    Task<DailyWorkDto<WeeklyPlanFormDto>> GetDailyPlanAsync(DateOnly date, CancellationToken cancellationToken);

    /// <summary>Kế hoạch – thực hiện của cùng 1 tuần theo xưởng: số việc, mã vật tư, giờ công KH/TT, %, phút theo đầu mục.</summary>
    Task<WorkReportDashboardDto> GetDashboardAsync(WorkReportDashboardRequest request, CancellationToken cancellationToken);
}