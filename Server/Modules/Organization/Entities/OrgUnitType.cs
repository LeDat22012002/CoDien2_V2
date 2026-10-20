namespace Server.Modules.Organization.Entities;

// ===== Entity =====

/// <summary>Loại đơn vị; quyết định cấp nào là trưởng / phó của đơn vị.</summary>
public class OrgUnitType
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>Cấp trưởng mặc định (đơn vị có thể ghi đè bằng OrgUnit.HeadLevelCode).</summary>
    public string HeadLevelCode { get; set; } = string.Empty;

    public string? DeputyLevelCode { get; set; }

    /// <summary>False = cho phép nhiều trưởng cùng lúc (vd Kỹ sư theo ca).</summary>
    public bool SingleHead { get; set; } = true;

    public int SortOrder { get; set; }
}

// ===== Giá trị cố định =====

public static class OrgUnitTypeCodes
{
    public const string Factory = "FACTORY";
    public const string Workshop = "WORKSHOP";
    public const string Team = "TEAM";
    public const string Shift = "SHIFT";
    public const string Section = "SECTION";

    /// <summary>Tổ: không là node riêng trên sơ đồ, gộp vào khối "Tổ trưởng" của đơn vị cha.</summary>
    public const string Group = "GROUP";
}
