using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

public interface IWorkReportSettingService
{
    Task<WorkReportSettingDto> GetAsync(CancellationToken cancellationToken);

    /// <summary>Lưu cấu hình; hạn chưa tới của các tuần chưa chỉnh tay được tính lại theo cấu hình mới.</summary>
    Task<WorkReportSettingDto> UpdateAsync(UpdateWorkReportSettingRequest request, CancellationToken cancellationToken);
}