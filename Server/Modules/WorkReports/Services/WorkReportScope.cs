namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Phạm vi báo cáo tuần của người đang gọi (tính 1 lần mỗi request trong WorkReportScopeService).
/// Mã quyền quyết định vai trò, phân công / sơ đồ tổ chức quyết định đơn vị: không có quyền thì tập tương ứng rỗng.
/// </summary>
public sealed class WorkReportScope
{
    public int? EmployeeId { get; init; }

    /// <summary>work-reports.configure (SUPER_ADMIN luôn có).</summary>
    public bool CanConfigure { get; init; }

    /// <summary>Xem mọi xưởng, chỉ xem: request của trang công khai (IWorkReportScopeService.UsePublicView).</summary>
    public bool CanViewFactory { get; init; }

    /// <summary>Id đơn vị báo cáo người gọi là kỹ sư phụ trách (cần work-reports.submit).</summary>
    public IReadOnlySet<int> EngineerUnitIds { get; init; } = new HashSet<int>();

    /// <summary>OrgUnit.Id các Đội (TEAM) người gọi là trưởng/phó (cần work-reports.manage).</summary>
    public IReadOnlySet<int> ManagedTeamIds { get; init; } = new HashSet<int>();

    /// <summary>OrgUnit.Id các xưởng (đơn vị cấp 1) người gọi là trưởng/phó (cần work-reports.manage).</summary>
    public IReadOnlySet<int> ManagedWorkshopIds { get; init; } = new HashSet<int>();
}
