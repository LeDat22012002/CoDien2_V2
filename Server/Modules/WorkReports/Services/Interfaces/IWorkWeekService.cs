using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services.Interfaces;

public interface IWorkWeekService
{
    /// <summary>
    /// Tạo các kỳ tuần còn thiếu, bắt đầu từ tuần chứa fromDate, weekCount tuần liên tiếp (tự SaveChanges).
    /// Chỉ gọi ở đầu thao tác đọc hoặc từ tác vụ nền, không gọi giữa chừng khi đang có thay đổi chưa lưu.
    /// </summary>
    Task EnsureWeeksAsync(DateOnly fromDate, int weekCount, CancellationToken cancellationToken);

    Task<IReadOnlyList<WorkWeekDto>> GetListAsync(WorkWeekFilterRequest filter, CancellationToken cancellationToken);

    Task<WorkWeekDto> GetByIdAsync(int id, int? workshopId, CancellationToken cancellationToken);

    /// <summary>Tuần đang nhập báo cáo và tuần đang lập kế hoạch tại thời điểm hiện tại (theo hạn của xưởng nếu có).</summary>
    Task<WorkingWeeksDto> GetWorkingWeeksAsync(int? workshopId, CancellationToken cancellationToken);

    Task<WorkWeekDto> UpdateDeadlineAsync(
        int id, UpdateWorkWeekDeadlineRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Sau khi đổi cấu hình hạn mặc định: tính lại hạn chưa tới của các tuần chưa chỉnh tay.
    /// Chỉ đánh dấu thay đổi, người gọi SaveChanges.
    /// </summary>
    Task RecalculateDefaultDeadlinesAsync(WorkReportSetting setting, CancellationToken cancellationToken);
}