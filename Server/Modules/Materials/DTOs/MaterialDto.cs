using Server.Shared.Models;

namespace Server.Modules.Materials.DTOs;

// ===== Response =====

public class MaterialDto
{
    public int Id { get; init; }
    public string? Code { get; init; }
    public string? Description { get; init; }
    public string? BasicDataText { get; init; }
    public string? Plant { get; init; }
    public string? MaterialGroup { get; init; }
    public string? Class { get; init; }
    public string? Level { get; init; }
    public string? MaterialLevel { get; init; }
    public string? DocumentNo { get; init; }
    public string? TypeOfSupplies { get; init; }
    /// <summary>Đơn vị tính (cột BOM).</summary>
    public string? Uom { get; init; }
}

/// <summary>Gợi ý mã vật tư khi nhập (ô Mã VT): đủ để tự điền tên và đơn vị tính.</summary>
public class MaterialOptionDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Uom { get; init; }
    public string? Plant { get; init; }
}

/// <summary>Giá trị có sẵn trong danh mục cho các ô lọc của trang quản trị.</summary>
public class MaterialLookupsDto
{
    public IReadOnlyList<string> Plants { get; init; } = [];
    public IReadOnlyList<string> MaterialGroups { get; init; } = [];
    public IReadOnlyList<string> TypesOfSupplies { get; init; } = [];
    public IReadOnlyList<string> MaterialLevels { get; init; } = [];
}

// ===== Request =====

public abstract class MaterialRequestBase
{
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? BasicDataText { get; set; }
    public string? Plant { get; set; }
    public string? MaterialGroup { get; set; }
    public string? Class { get; set; }
    public string? Level { get; set; }
    public string? MaterialLevel { get; set; }
    public string? DocumentNo { get; set; }
    public string? TypeOfSupplies { get; set; }
    public string? Uom { get; set; }
}

public class CreateMaterialRequest : MaterialRequestBase;

public class UpdateMaterialRequest : MaterialRequestBase;

/// <summary>
/// Keyword tìm theo mã hoặc tên (chứa chuỗi). Các ô lọc còn lại so khớp đúng giá trị.
/// SortBy: id | code | description | plant | materialGroup | typeOfSupplies; SortDirection: asc | desc (mặc định asc theo mã).
/// </summary>
public class MaterialFilterRequest : PagedRequest
{
    public string? Plant { get; set; }
    public string? MaterialGroup { get; set; }
    public string? TypeOfSupplies { get; set; }
    public string? MaterialLevel { get; set; }

    /// <summary>true = chỉ vật tư chưa có đơn vị tính (để bổ sung).</summary>
    public bool? MissingUom { get; set; }

    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }
}