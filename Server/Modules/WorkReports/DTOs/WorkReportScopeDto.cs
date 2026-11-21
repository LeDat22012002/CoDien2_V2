using System.Text.Json.Serialization;

namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

/// <summary>Phạm vi báo cáo tuần của người đang đăng nhập; FE dùng để ẩn/hiện, quyền thật vẫn kiểm tra ở Service.</summary>
public class MyWorkReportScopeDto
{
    public int? EmployeeId { get; init; }

    /// <summary>Có quyền work-reports.configure.</summary>
    public bool CanConfigure { get; init; }

    /// <summary>Xem mọi xưởng, chỉ xem (trang công khai /work-reports).</summary>
    public bool CanViewFactory { get; init; }

    /// <summary>Có quyền work-reports.export: hiện nút "Xuất Excel" (trang công khai không có).</summary>
    public bool CanExport { get; init; }

    public IReadOnlyList<WorkReportScopeWorkshopDto> Workshops { get; init; } = [];
}

public class WorkReportScopeWorkshopDto
{
    public int WorkshopId { get; init; }
    public string WorkshopName { get; init; } = string.Empty;

    /// <summary>Quản đốc/phó của xưởng (hoặc admin).</summary>
    public bool IsManager { get; init; }

    public IReadOnlyList<WorkReportUnitAccessDto> Units { get; init; } = [];
}

/// <summary>Quyền của người đang gọi trên 1 đơn vị báo cáo.</summary>
public class WorkReportUnitAccessDto
{
    public int UnitId { get; init; }
    public int OrgUnitId { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string LaborType { get; init; } = string.Empty;
    public int SortOrder { get; init; }

    /// <summary>Vai trò cao nhất, xem <see cref="WorkReportRoles"/>.</summary>
    public string Role { get; init; } = string.Empty;

    public bool CanView { get; init; }

    /// <summary>Thêm/sửa/xóa dòng kế hoạch (khi kế hoạch đang mở): kỹ sư phụ trách, hoặc quyền plan.* trong phạm vi.</summary>
    public WorkReportRightsDto Plan { get; init; } = new();

    /// <summary>Thêm/sửa/xóa dòng báo cáo (khi báo cáo đang mở): kỹ sư phụ trách, hoặc quyền report.* trong phạm vi.</summary>
    public WorkReportRightsDto Report { get; init; } = new();

    /// <summary>Mở khóa kế hoạch / báo cáo đã quá hạn: quyền work-reports.unlock trong phạm vi trưởng/phó (configure: mọi xưởng).</summary>
    public bool CanUnlock { get; init; }

    /// <summary>Phân công kỹ sư: quyền work-reports.assign-engineers; kíp chỉ quản đốc/phó, tổ thêm đội trưởng/phó (configure: mọi xưởng).</summary>
    public bool CanManageEngineers { get; init; }

    /// <summary>Cấu hình tổ/kíp: configure, hoặc manage + quản đốc/phó của xưởng.</summary>
    public bool CanConfigure { get; init; }
}

public class WorkReportRightsDto
{
    public bool CanCreate { get; init; }
    public bool CanUpdate { get; init; }
    public bool CanDelete { get; init; }

    [JsonIgnore]
    public bool Any => CanCreate || CanUpdate || CanDelete;
}

// ===== Giá trị cố định =====

public static class WorkReportRoles
{
    public const string Admin = "ADMIN";
    public const string WorkshopManager = "WORKSHOP_MANAGER";
    public const string TeamManager = "TEAM_MANAGER";
    public const string Engineer = "ENGINEER";
    public const string Viewer = "VIEWER";
    public const string None = "NONE";
}