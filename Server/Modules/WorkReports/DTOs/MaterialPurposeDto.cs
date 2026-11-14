namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class MaterialPurposeDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string? Name { get; init; }
    public int SortOrder { get; init; }
    public bool IsActive { get; init; }
}

// ===== Request =====

public abstract class MaterialPurposeRequestBase
{
    public string Code { get; set; } = string.Empty;
    public string? Name { get; set; }

    /// <summary>Null khi tạo = xếp cuối.</summary>
    public int? SortOrder { get; set; }
}

public class CreateMaterialPurposeRequest : MaterialPurposeRequestBase;

public class UpdateMaterialPurposeRequest : MaterialPurposeRequestBase;

public class SetMaterialPurposeActiveRequest
{
    public bool IsActive { get; set; }
}