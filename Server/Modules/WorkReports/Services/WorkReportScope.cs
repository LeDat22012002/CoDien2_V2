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

    /// <summary>work-reports.manage: xem, cấu hình tổ/kíp (quản đốc/phó) trong đội/xưởng mình là trưởng/phó.</summary>
    public bool CanManage { get; init; }

    /// <summary>work-reports.assign-engineers: phân công kỹ sư trong phạm vi trưởng/phó (configure → mọi xưởng).</summary>
    public bool CanAssignEngineers { get; init; }

    /// <summary>work-reports.unlock: mở khóa form quá hạn trong phạm vi trưởng/phó (configure → mọi xưởng).</summary>
    public bool CanUnlock { get; init; }

    /// <summary>Xem mọi xưởng, chỉ xem: request của trang công khai (IWorkReportScopeService.UsePublicView).</summary>
    public bool CanViewFactory { get; init; }

    /// <summary>Id đơn vị báo cáo người gọi đang là kỹ sư phụ trách hôm nay (cần work-reports.submit): quyền thêm/sửa/xóa.</summary>
    public IReadOnlySet<int> EngineerUnitIds { get; init; } = new HashSet<int>();

    /// <summary>
    /// Mọi lần người gọi được phân công phụ trách (kể cả đã kết thúc, đơn vị đã ngừng dùng / đã xóa; cần work-reports.submit).
    /// Theo tuần của form: kỹ sư đang phụ trách chỉ xem/sửa từ tuần bắt đầu phụ trách trở đi;
    /// kỹ sư đã bị thay chỉ XEM các tuần từng phụ trách (vd tuần 46 sau khi bị thay người ở tuần 47).
    /// </summary>
    public IReadOnlyList<EngineerAssignmentPeriod> EngineerHistory { get; init; } = [];

    /// <summary>OrgUnit.Id các Đội (TEAM) người gọi là trưởng/phó (chỉ tính khi có manage, assign-engineers, unlock hoặc quyền thêm/sửa/xóa).</summary>
    public IReadOnlySet<int> HeadTeamIds { get; init; } = new HashSet<int>();

    /// <summary>OrgUnit.Id các xưởng (đơn vị cấp 1) người gọi là trưởng/phó (chỉ tính khi có quyền dùng theo chức vụ).</summary>
    public IReadOnlySet<int> HeadWorkshopIds { get; init; } = new HashSet<int>();

    /// <summary>Quyền thêm/sửa/xóa kế hoạch do admin cấp (work-reports.plan.*), dùng trong phạm vi trưởng/phó.</summary>
    public PhaseRights PlanRights { get; init; } = PhaseRights.None;

    /// <summary>Quyền thêm/sửa/xóa báo cáo do admin cấp (work-reports.report.*).</summary>
    public PhaseRights ReportRights { get; init; } = PhaseRights.None;

    /// <summary>Đội người gọi quản lý (manage + trưởng/phó đội).</summary>
    public IReadOnlySet<int> ManagedTeamIds => CanManage ? HeadTeamIds : EmptySet;

    /// <summary>Xưởng người gọi quản lý (manage + quản đốc/phó).</summary>
    public IReadOnlySet<int> ManagedWorkshopIds => CanManage ? HeadWorkshopIds : EmptySet;

    private static readonly IReadOnlySet<int> EmptySet = new HashSet<int>();
}

/// <summary>1 lần phụ trách đơn vị báo cáo: OrgUnitId của đơn vị để biết xưởng (kể cả đơn vị đã xóa).</summary>
public sealed record EngineerAssignmentPeriod(int UnitId, int OrgUnitId, DateOnly StartDate, DateOnly? EndDate)
{
    /// <summary>Phân công có hiệu lực ít nhất 1 ngày trong khoảng [from, to].</summary>
    public bool Overlaps(DateOnly from, DateOnly to) => StartDate <= to && (EndDate is null || EndDate >= from);

    /// <summary>Phân công có hiệu lực vào ngày day.</summary>
    public bool IsActiveOn(DateOnly day) => StartDate <= day && (EndDate is null || EndDate >= day);
}

/// <summary>Thêm / sửa / xóa dòng (và vật tư) của 1 giai đoạn.</summary>
public readonly record struct PhaseRights(bool Create, bool Update, bool Delete)
{
    public static readonly PhaseRights None = new(false, false, false);

    public static readonly PhaseRights All = new(true, true, true);

    public bool Any => Create || Update || Delete;
}