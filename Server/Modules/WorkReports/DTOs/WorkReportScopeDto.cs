namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

/// <summary>Phạm vi báo cáo tuần của người đang đăng nhập; FE dùng để ẩn/hiện, quyền thật vẫn kiểm tra ở Service.</summary>
public class MyWorkReportScopeDto
{
    public int? EmployeeId { get; init; }

    /// <summary>Có quyền work-reports.configure.</summary>
    public bool CanConfigure { get; init; }

    /// <summary>Xem mọi xưởng (work-reports.view-factory hoặc trưởng/phó Nhà máy).</summary>
    public bool CanViewFactory { get; init; }

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

    /// <summary>Nhập/sửa khi form đang mở.</summary>
    public bool CanEdit { get; init; }

    /// <summary>Sửa cả khi form đã khóa (quản đốc/phó).</summary>
    public bool CanEditLocked { get; init; }

    public bool CanRequestRevision { get; init; }
    public bool CanUnlock { get; init; }
    public bool CanManageEngineers { get; init; }
    public bool CanConfigure { get; init; }
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