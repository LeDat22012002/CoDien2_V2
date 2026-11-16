using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Server.Modules.WorkReports.Hubs;

/// <summary>
/// Cập nhật tức thì báo cáo tuần (SignalR, đường dẫn <see cref="Path"/>). Trang đang mở vào nhóm theo (xưởng, tuần);
/// Server gửi <see cref="FormChangedEvent"/> khi dòng / vật tư / mở khóa của 1 tổ/kíp thay đổi.
/// Tin <b>không chứa dữ liệu</b>, chỉ báo "có thay đổi": mỗi trang tự tải lại qua API của mình (đúng quyền),
/// nên hub cho kết nối không cần đăng nhập (trang công khai /work-reports cũng nhận).
/// </summary>
[AllowAnonymous]
public class WorkReportHub : Hub
{
    public const string Path = "/api/hubs/work-reports";

    /// <summary>Tên sự kiện client lắng nghe.</summary>
    public const string FormChangedEvent = "FormChanged";

    public static string GroupName(int workshopId, int weekId) => $"ws:{workshopId}:week:{weekId}";

    /// <summary>Vào nhóm xưởng + tuần đang xem (đổi xưởng / tuần thì Leave rồi Join lại).</summary>
    public Task JoinWeek(int workshopId, int weekId) =>
        workshopId > 0 && weekId > 0
            ? Groups.AddToGroupAsync(Context.ConnectionId, GroupName(workshopId, weekId))
            : Task.CompletedTask;

    public Task LeaveWeek(int workshopId, int weekId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(workshopId, weekId));
}

/// <summary>Nội dung sự kiện FormChanged.</summary>
/// <param name="Phase">PLAN | REPORT.</param>
public sealed record WorkReportFormChanged(int WorkshopId, int WeekId, int FormId, string Phase);
