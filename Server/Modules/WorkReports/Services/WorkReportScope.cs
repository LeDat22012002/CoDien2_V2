namespace Server.Modules.WorkReports.Services;

/// <summary>Phạm vi báo cáo tuần của người đang gọi (tính 1 lần mỗi request trong WorkReportScopeService).</summary>
public sealed class WorkReportScope
{
    public int? EmployeeId { get; init; }

    /// <summary>work-reports.configure (SUPER_ADMIN luôn có).</summary>
    public bool CanConfigure { get; init; }

    /// <summary>work-reports.view-factory hoặc trưởng/phó Nhà máy.</summary>
    public bool CanViewFactory { get; init; }

    /// <summary>Id đơn vị báo cáo người gọi đang là kỹ sư phụ trách.</summary>
    public IReadOnlySet<int> EngineerUnitIds { get; init; } = new HashSet<int>();

    /// <summary>OrgUnit.Id các Đội (TEAM) người gọi là trưởng/phó.</summary>
    public IReadOnlySet<int> ManagedTeamIds { get; init; } = new HashSet<int>();

    /// <summary>OrgUnit.Id các xưởng (đơn vị cấp 1) người gọi là trưởng/phó (quản đốc/phó quản đốc).</summary>
    public IReadOnlySet<int> ManagedWorkshopIds { get; init; } = new HashSet<int>();
}