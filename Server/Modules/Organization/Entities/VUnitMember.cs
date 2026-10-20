namespace Server.Modules.Organization.Entities;

// ===== View =====

/// <summary>View dbo.vUnitMember: người đang giữ vị trí + vai trò trong đơn vị + hàng hiển thị (chỉ đọc).</summary>
public class VUnitMember
{
    public int AssignmentId { get; set; }
    public int OrgUnitId { get; set; }
    public string OrgUnitCode { get; set; } = string.Empty;
    public string OrgUnitName { get; set; } = string.Empty;
    public string OrgUnitTypeCode { get; set; } = string.Empty;
    public int? OrgUnitParentId { get; set; }
    public int EmployeeId { get; set; }
    public string EmpCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string LevelCode { get; set; } = string.Empty;
    public string LevelName { get; set; } = string.Empty;
    public short Rank { get; set; }
    public byte ChartRow { get; set; }
    public string DisplayMode { get; set; } = string.Empty;
    public string? BlockLabel { get; set; }

    /// <summary>HEAD | DEPUTY | MEMBER (xem UnitRoles).</summary>
    public string UnitRole { get; set; } = string.Empty;

    public bool IsActing { get; set; }
    public bool IsPrimary { get; set; }
    public string? JobTitle { get; set; }
    public DateOnly StartDate { get; set; }
}

// ===== Giá trị cố định =====

public static class UnitRoles
{
    public const string Head = "HEAD";
    public const string Deputy = "DEPUTY";

    /// <summary>Thành viên, gộp thành khối theo cấp bậc trên sơ đồ.</summary>
    public const string Member = "MEMBER";
}
