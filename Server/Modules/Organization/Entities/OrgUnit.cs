namespace Server.Modules.Organization.Entities;

/// <summary>
/// Cây đơn vị: Nhà máy → Xưởng / Đội trực thuộc / Bộ phận → Đội / Nhóm theo ca → Tổ.
/// Bảng dbo.OrgUnit có sẵn; xóa = IsActive false.
/// </summary>
public class OrgUnit
{
    public int Id { get; set; }

    /// <summary>Vd X.CĐLG1, X.CĐLG1-D01, X.CĐLG1-D01-T01. Không đổi sau khi tạo.</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string? ShortName { get; set; }

    /// <summary>Không đổi sau khi tạo.</summary>
    public string TypeCode { get; set; } = string.Empty;

    /// <summary>Null = Nhà máy (gốc).</summary>
    public int? ParentId { get; set; }

    /// <summary>Ghi đè cấp trưởng của loại đơn vị (vd Kho = TK, Hành chính ISO = NV).</summary>
    public string? HeadLevelCode { get; set; }

    public string? DisciplineCode { get; set; }
    public string? Area { get; set; }

    /// <summary>Ca A / B / C với đơn vị theo ca.</summary>
    public string? Shift { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public OrgUnitType Type { get; set; } = null!;
    public OrgUnit? Parent { get; set; }
    public ICollection<OrgUnit> Children { get; set; } = [];
}
