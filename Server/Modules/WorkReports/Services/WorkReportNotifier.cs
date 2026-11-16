using Microsoft.AspNetCore.SignalR;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Hubs;
using Server.Modules.WorkReports.Services.Interfaces;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Gửi FormChanged tới các trang đang xem cùng xưởng + tuần. Gọi sau khi đã lưu thành công;
/// lỗi gửi chỉ ghi log, không làm hỏng thao tác ghi.
/// </summary>
public class WorkReportNotifier(
    IHubContext<WorkReportHub> hubContext,
    ILogger<WorkReportNotifier> logger) : IWorkReportNotifier
{
    public async Task FormChangedAsync(WeeklyForm form, string phase)
    {
        try
        {
            await hubContext.Clients
                .Group(WorkReportHub.GroupName(form.WorkshopId, form.WorkWeekId))
                .SendAsync(
                    WorkReportHub.FormChangedEvent,
                    new WorkReportFormChanged(form.WorkshopId, form.WorkWeekId, form.Id, phase));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Không gửi được cập nhật tức thì cho form {FormId}", form.Id);
        }
    }
}
