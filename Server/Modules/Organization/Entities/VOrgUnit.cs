namespace Server.Modules.Organization.Entities;

/// <summary>View dbo.vOrgUnit: đơn vị đang hoạt động kèm cấp trưởng / phó thực tế (chỉ đọc).</summary>
public class VOrgUnit
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public string TypeCode { get; set; } = string.Empty;
    public string TypeName { get; set; } = string.Empty;
    public int? ParentId { get; set; }

    /// <summary>Đã áp dụng ghi đè của OrgUnit.HeadLevelCode.</summary>
    public string HeadLevelCode { get; set; } = string.Empty;

    public string? DeputyLevelCode { get; set; }
    public bool SingleHead { get; set; }
    public string? DisciplineCode { get; set; }
    public string? Area { get; set; }
    public string? Shift { get; set; }
    public int SortOrder { get; set; }
    public string? Note { get; set; }
}
