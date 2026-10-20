namespace Server.Modules.Organization.DTOs;

// ===== Response: sơ đồ =====

/// <summary>Kết quả GET /api/org-chart: toàn bộ cây + số liệu tổng.</summary>
public class OrgChartTreeDto
{
    public OrgChartNodeDto? Root { get; init; }
    public int TotalEmployees { get; init; }
    public int TotalWorkshops { get; init; }
    public int TotalTeams { get; init; }
    public int TotalGroups { get; init; }

    /// <summary>Số đơn vị (kể cả Tổ) chưa có trưởng.</summary>
    public int VacantHeadCount { get; init; }

    /// <summary>Số hàng của sơ đồ.</summary>
    public int MaxRow { get; init; }
}

/// <summary>
/// 1 đơn vị trên sơ đồ (Nhà máy, Xưởng, Đội, Nhóm theo ca, Bộ phận). Tổ không là node riêng
/// mà được gộp vào khối "Tổ trưởng" trong Blocks của đơn vị cha.
/// Row = ChartRow của cấp trưởng; Heads rỗng = chưa bổ nhiệm; Deputies hiện khi hover
/// (riêng Nhà máy: PGĐ vẽ thành hàng DeputyRow); Blocks = các khối hàng 5–6; Children không gồm Tổ.
/// </summary>
public class OrgChartNodeDto
{
    public int OrgUnitId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? ShortName { get; init; }
    public string TypeCode { get; init; } = string.Empty;
    public string TypeName { get; init; } = string.Empty;
    public int? ParentId { get; init; }
    public int Row { get; init; }

    /// <summary>Khác Row → vẽ phó thành hàng riêng (PGĐ hàng 2).</summary>
    public int? DeputyRow { get; init; }

    public string DisplayMode { get; init; } = string.Empty;
    public string HeadLevelCode { get; init; } = string.Empty;
    public string HeadLevelName { get; init; } = string.Empty;
    public string? DeputyLevelName { get; init; }
    public string? DisciplineCode { get; init; }
    public string? Area { get; init; }
    public int SortOrder { get; init; }

    /// <summary>Quân số cả nhánh (gồm cả Tổ).</summary>
    public int TotalHeadcount { get; init; }

    public List<OrgChartPersonDto> Heads { get; init; } = [];
    public List<OrgChartPersonDto> Deputies { get; init; } = [];
    public List<OrgChartBlockDto> Blocks { get; set; } = [];
    public List<OrgChartNodeDto> Children { get; set; } = [];
}

/// <summary>Khối gộp dưới 1 đơn vị: theo cấp bậc (Kind LEVEL → People) hoặc gộp các Tổ (Kind GROUPS → Groups).</summary>
public class OrgChartBlockDto
{
    /// <summary>Vd "U12-KS", "U12-GROUPS" — dùng làm key trên UI.</summary>
    public string Key { get; init; } = string.Empty;

    /// <summary>LEVEL | GROUPS.</summary>
    public string Kind { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;
    public string LevelCode { get; init; } = string.Empty;
    public int Row { get; init; }
    public int PeopleCount { get; init; }

    /// <summary>Chỉ có ý nghĩa với Kind = GROUPS.</summary>
    public int GroupCount { get; init; }

    public List<OrgChartPersonDto> People { get; init; } = [];
    public List<OrgChartGroupDto> Groups { get; init; } = [];
}

/// <summary>1 Tổ trong khối "Tổ trưởng".</summary>
public class OrgChartGroupDto
{
    public int OrgUnitId { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Shift { get; init; }

    /// <summary>Rỗng = chưa có Tổ trưởng.</summary>
    public List<OrgChartPersonDto> Leaders { get; init; } = [];
}

/// <summary>1 người trên sơ đồ.</summary>
public class OrgChartPersonDto
{
    public int AssignmentId { get; init; }
    public int EmployeeId { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string LevelCode { get; init; } = string.Empty;
    public string LevelName { get; init; } = string.Empty;
    public bool IsActing { get; init; }
    public string? JobTitle { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? AvatarUrl { get; init; }
    public DateOnly StartDate { get; init; }
}

/// <summary>Người đang giữ vị trí trong 1 đơn vị.</summary>
public class UnitMemberDto
{
    public int AssignmentId { get; init; }
    public int EmployeeId { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? AvatarUrl { get; init; }
    public string LevelCode { get; init; } = string.Empty;
    public string LevelName { get; init; } = string.Empty;
    public short Rank { get; init; }
    public int ChartRow { get; init; }

    /// <summary>HEAD | DEPUTY | MEMBER.</summary>
    public string UnitRole { get; init; } = string.Empty;

    public bool IsActing { get; init; }
    public bool IsPrimary { get; init; }
    public string? JobTitle { get; init; }
    public DateOnly StartDate { get; init; }
}

// ===== Response: danh mục cho dropdown =====

public class LookupsDto
{
    public List<OrgUnitTypeDto> OrgUnitTypes { get; init; } = [];
    public List<PositionLevelDto> PositionLevels { get; init; } = [];
    public List<LookupItemDto> Disciplines { get; init; } = [];
}

public class OrgUnitTypeDto
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string HeadLevelCode { get; init; } = string.Empty;
    public string? DeputyLevelCode { get; init; }
    public bool SingleHead { get; init; }

    /// <summary>Loại đơn vị cha hợp lệ; rỗng = loại gốc (Nhà máy).</summary>
    public List<string> AllowedParentTypes { get; init; } = [];
}

public class LookupItemDto
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}
