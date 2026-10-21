using Server.Shared.Models;

namespace Server.Modules.Equipments.DTOs;

// ===== Response =====

public class EquipmentDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string? Name { get; init; }
}

/// <summary>Kết quả import danh mục thiết bị từ Excel.</summary>
public class EquipmentImportResultDto
{
    public int TotalRows { get; set; }
    public int InsertedCount { get; set; }

    /// <summary>Mã đã có trong danh mục hoặc lặp lại trong file.</summary>
    public int SkippedCount { get; set; }

    public List<string> Errors { get; init; } = [];
}

// ===== Request =====

public abstract class EquipmentRequestBase
{
    public string Code { get; set; } = string.Empty;
    public string? Name { get; set; }
}

public class CreateEquipmentRequest : EquipmentRequestBase;

public class UpdateEquipmentRequest : EquipmentRequestBase;

/// <summary>Keyword tìm theo mã hoặc tên. SortBy: id | code | name; SortDirection: asc | desc.</summary>
public class EquipmentFilterRequest : PagedRequest
{
    public string? Code { get; set; }
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }
}

/// <summary>Cấu hình đọc 1 sheet khi import; cột đánh số từ 1 (A = 1).</summary>
public class EquipmentImportSheetConfig
{
    public string SheetName { get; set; } = string.Empty;
    public int StartRow { get; set; } = 2;
    public int CodeColumn { get; set; } = 1;
    public int NameColumn { get; set; } = 2;
}
