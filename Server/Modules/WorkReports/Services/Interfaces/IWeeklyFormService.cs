using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

public interface IWeeklyFormService
{
    /// <summary>
    /// Đồng bộ form của các tuần đang làm việc (tuần trước nếu báo cáo chưa khóa, tuần này, tuần sau), tự SaveChanges:
    /// tạo form còn thiếu cho đơn vị đang dùng; cập nhật thông tin chụp của form chưa khóa báo cáo;
    /// bỏ form trống của tuần chưa bắt đầu khi đơn vị đã ngừng. unitIds null = mọi đơn vị.
    /// Gọi sau khi đã lưu thay đổi của mình (tác vụ nền, thêm/sửa đơn vị, đổi kỹ sư, đổi cấu hình).
    /// </summary>
    Task SyncFormsAsync(IReadOnlyCollection<int>? unitIds, CancellationToken cancellationToken);

    /// <summary>
    /// Form + quyền + trạng thái giai đoạn. forEdit = true: người gọi phải thêm/sửa được ngay
    /// (ném 403 nếu không có quyền nhập, 400 nếu chưa tới tuần / đã khóa).
    /// </summary>
    Task<WeeklyFormContext> GetContextAsync(int formId, string phase, bool forEdit, CancellationToken cancellationToken);

    /// <summary>
    /// Form của xưởng trong tuần mà người gọi xem được, theo thứ tự đơn vị trong xưởng.
    /// Tuần đang làm việc thì tự tạo form còn thiếu. Không liên quan tới xưởng → 403.
    /// </summary>
    Task<IReadOnlyList<WeeklyFormContext>> GetVisibleFormsAsync(
        int workshopId, int weekId, string phase, int? unitId, CancellationToken cancellationToken);

    Task<WorkReportGridDto> GetGridAsync(WorkReportGridRequest request, CancellationToken cancellationToken);

    Task<WorkReportSummaryDto> GetSummaryAsync(WorkReportGridRequest request, CancellationToken cancellationToken);
}
