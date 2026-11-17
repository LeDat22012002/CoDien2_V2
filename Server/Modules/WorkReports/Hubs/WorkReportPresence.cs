using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace Server.Modules.WorkReports.Hubs;

/// <summary>1 người đang sửa / thêm dòng (ItemId null = đang thêm dòng mới ở tổ/kíp đó).</summary>
/// <param name="Phase">PLAN | REPORT.</param>
public sealed record WorkReportEditorDto(
    string ConnectionId, int UserId, string FullName, int FormId, string Phase, int? ItemId, DateTime Since);

/// <summary>Nội dung sự kiện PresenceChanged: toàn bộ người đang sửa của 1 xưởng + tuần.</summary>
public sealed record WorkReportPresenceChanged(int WorkshopId, int WeekId, IReadOnlyList<WorkReportEditorDto> Editors);

/// <summary>(Xưởng, tuần) của 1 nhóm SignalR.</summary>
public readonly record struct WeekGroup(int WorkshopId, int WeekId);

/// <summary>
/// "Ai đang sửa dòng nào" (khóa mềm, chỉ để hiển thị): lưu trong bộ nhớ, mỗi kết nối tối đa 1 dòng.
/// Client gửi Heartbeat định kỳ; quá <see cref="Timeout"/> không thấy thì tự bỏ (mất mạng, đóng trình duyệt).
/// Chạy 1 tiến trình (1 site IIS) nên không cần dùng chung giữa các máy chủ.
/// </summary>
public sealed class WorkReportPresenceTracker
{
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(90);

    private sealed record Entry(WeekGroup Group, WorkReportEditorDto Editor, DateTime LastSeen);

    private readonly ConcurrentDictionary<string, Entry> _entries = new();

    /// <summary>Ghi dòng đang sửa của kết nối; trả nhóm cũ nếu kết nối vừa chuyển sang xưởng / tuần khác.</summary>
    public WeekGroup? Set(WeekGroup group, WorkReportEditorDto editor)
    {
        var now = DateTime.Now;
        WeekGroup? previous = null;
        _entries.AddOrUpdate(
            editor.ConnectionId,
            _ => new Entry(group, editor, now),
            (_, old) =>
            {
                if (old.Group != group)
                {
                    previous = old.Group;
                }

                // Vẫn sửa đúng dòng đó thì giữ thời điểm bắt đầu
                var isSameTarget = old.Group == group && old.Editor.FormId == editor.FormId
                                   && old.Editor.Phase == editor.Phase && old.Editor.ItemId == editor.ItemId;
                return new Entry(group, isSameTarget ? editor with { Since = old.Editor.Since } : editor, now);
            });
        return previous;
    }

    /// <summary>Bỏ dòng đang sửa của kết nối; trả nhóm của nó (null = không sửa gì).</summary>
    public WeekGroup? Remove(string connectionId) =>
        _entries.TryRemove(connectionId, out var entry) ? entry.Group : null;

    public void Touch(string connectionId)
    {
        if (_entries.TryGetValue(connectionId, out var entry))
        {
            _entries.TryUpdate(connectionId, entry with { LastSeen = DateTime.Now }, entry);
        }
    }

    public IReadOnlyList<WorkReportEditorDto> GetEditors(WeekGroup group) =>
        _entries.Values
            .Where(x => x.Group == group)
            .Select(x => x.Editor)
            .OrderBy(x => x.Since)
            .ToList();

    /// <summary>Bỏ các mục quá hạn; trả các nhóm bị ảnh hưởng để gửi lại danh sách.</summary>
    public IReadOnlyList<WeekGroup> RemoveStale()
    {
        var cutoff = DateTime.Now - Timeout;
        var groups = new HashSet<WeekGroup>();
        foreach (var (connectionId, entry) in _entries)
        {
            if (entry.LastSeen < cutoff && _entries.TryRemove(new KeyValuePair<string, Entry>(connectionId, entry)))
            {
                groups.Add(entry.Group);
            }
        }

        return groups.ToList();
    }

    public WorkReportPresenceChanged Snapshot(WeekGroup group) =>
        new(group.WorkshopId, group.WeekId, GetEditors(group));
}

/// <summary>Mỗi 30 giây bỏ người sửa không còn heartbeat và báo lại cho nhóm.</summary>
public sealed class WorkReportPresenceCleanupService(
    WorkReportPresenceTracker tracker,
    IHubContext<WorkReportHub> hubContext,
    ILogger<WorkReportPresenceCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            foreach (var group in tracker.RemoveStale())
            {
                try
                {
                    await hubContext.Clients
                        .Group(WorkReportHub.GroupName(group.WorkshopId, group.WeekId))
                        .SendAsync(WorkReportHub.PresenceChangedEvent, tracker.Snapshot(group), stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(ex, "Không gửi được danh sách người đang sửa");
                }
            }
        }
    }
}
