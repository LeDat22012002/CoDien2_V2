using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>Báo các trang đang mở (SignalR) rằng 1 tổ/kíp vừa đổi dữ liệu ở 1 giai đoạn.</summary>
public interface IWorkReportNotifier
{
    /// <param name="phase">PLAN | REPORT.</param>
    Task FormChangedAsync(WeeklyForm form, string phase);
}
