namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class WorkCategoryDto
{
    public int Id { get; init; }

    /// <summary>Giá trị dropdown cột (3), vd "BT-LV1".</summary>
    public string Code { get; init; } = string.Empty;

    public string GroupLetter { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string CodeSuffix { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public bool ShowInSummary { get; init; }
    public bool IsActive { get; init; }

    /// <summary>Rỗng = áp dụng mọi xưởng.</summary>
    public IReadOnlyList<int> WorkshopIds { get; init; } = [];
}

// ===== Request =====

public abstract class WorkCategoryRequestBase
{
    public string Code { get; set; } = string.Empty;
    public string GroupLetter { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CodeSuffix { get; set; } = string.Empty;

    /// <summary>Null khi tạo = xếp cuối.</summary>
    public int? SortOrder { get; set; }

    public bool ShowInSummary { get; set; } = true;

    /// <summary>Rỗng = áp dụng mọi xưởng.</summary>
    public List<int> WorkshopIds { get; set; } = [];
}

public class CreateWorkCategoryRequest : WorkCategoryRequestBase;

public class UpdateWorkCategoryRequest : WorkCategoryRequestBase;

public class SetWorkCategoryActiveRequest
{
    public bool IsActive { get; set; }
}

/// <summary>WorkshopId: chỉ lấy đầu mục áp dụng cho xưởng này.</summary>
public class WorkCategoryFilterRequest
{
    public bool IncludeInactive { get; set; }
    public int? WorkshopId { get; set; }
}