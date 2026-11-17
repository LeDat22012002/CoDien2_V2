using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Server.Modules.WorkReports.Entities;
using Server.Shared.Constants;

namespace Server.Modules.WorkReports.Hubs;

/// <summary>
/// Cập nhật tức thì báo cáo tuần (SignalR, đường dẫn <see cref="Path"/>). Trang đang mở vào nhóm theo (xưởng, tuần).
/// - <see cref="FormChangedEvent"/>: dòng / vật tư / mở khóa của 1 tổ/kíp thay đổi. Tin <b>không chứa dữ liệu</b>:
///   mỗi trang tự tải lại qua API của mình (đúng quyền), nên hub cho kết nối không cần đăng nhập.
/// - <see cref="PresenceChangedEvent"/>: ai đang sửa / thêm dòng nào (khóa mềm, chỉ hiển thị; chốt chặn thật vẫn là
///   rowVersion → 409). Báo "đang sửa" cần đăng nhập (token gửi qua query access_token).
/// </summary>
[AllowAnonymous]
public class WorkReportHub(WorkReportPresenceTracker presence) : Hub
{
    public const string Path = "/api/hubs/work-reports";

    /// <summary>Tên sự kiện client lắng nghe.</summary>
    public const string FormChangedEvent = "FormChanged";

    public const string PresenceChangedEvent = "PresenceChanged";

    public static string GroupName(int workshopId, int weekId) => $"ws:{workshopId}:week:{weekId}";

    /// <summary>Vào nhóm xưởng + tuần đang xem (đổi xưởng / tuần thì Leave rồi Join lại); nhận ngay danh sách người đang sửa.</summary>
    public async Task JoinWeek(int workshopId, int weekId)
    {
        if (workshopId <= 0 || weekId <= 0)
        {
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(workshopId, weekId));
        await Clients.Caller.SendAsync(PresenceChangedEvent, presence.Snapshot(new WeekGroup(workshopId, weekId)));
    }

    public Task LeaveWeek(int workshopId, int weekId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(workshopId, weekId));

    /// <summary>Bắt đầu sửa dòng itemId (null = đang thêm dòng mới) của form; gọi lại khi đổi dòng.</summary>
    public async Task StartEditing(int workshopId, int weekId, int formId, string phase, int? itemId)
    {
        if (!int.TryParse(Context.User?.FindFirstValue(AppClaimTypes.UserId), out var userId))
        {
            throw new HubException("Cần đăng nhập để báo đang sửa.");
        }

        if (workshopId <= 0 || weekId <= 0 || formId <= 0
            || phase is not (WorkReportPhases.Plan or WorkReportPhases.Report))
        {
            throw new HubException("Dữ liệu không hợp lệ.");
        }

        var fullName = Context.User!.FindFirstValue(AppClaimTypes.FullName)
                       ?? Context.User.FindFirstValue(AppClaimTypes.EmpCode)
                       ?? $"#{userId}";
        var group = new WeekGroup(workshopId, weekId);
        var previous = presence.Set(group, new WorkReportEditorDto(
            Context.ConnectionId, userId, fullName, formId, phase, itemId is > 0 ? itemId : null, DateTime.Now));

        await BroadcastAsync(group);
        if (previous is { } old)
        {
            await BroadcastAsync(old);
        }
    }

    /// <summary>Thôi sửa (lưu xong / hủy).</summary>
    public async Task StopEditing()
    {
        if (presence.Remove(Context.ConnectionId) is { } group)
        {
            await BroadcastAsync(group);
        }
    }

    /// <summary>Đang sửa vẫn còn ở trang: gửi mỗi 30 giây, quá 90 giây không gửi thì tự bỏ.</summary>
    public void Heartbeat() => presence.Touch(Context.ConnectionId);

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (presence.Remove(Context.ConnectionId) is { } group)
        {
            await BroadcastAsync(group);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private Task BroadcastAsync(WeekGroup group) =>
        Clients.Group(GroupName(group.WorkshopId, group.WeekId))
            .SendAsync(PresenceChangedEvent, presence.Snapshot(group));
}

/// <summary>Nội dung sự kiện FormChanged.</summary>
/// <param name="Phase">PLAN | REPORT.</param>
public sealed record WorkReportFormChanged(int WorkshopId, int WeekId, int FormId, string Phase);
