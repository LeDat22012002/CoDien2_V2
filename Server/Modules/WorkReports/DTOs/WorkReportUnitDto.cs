namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class WorkReportUnitDto
{
    public int Id { get; init; }
    public int OrgUnitId { get; init; }
    public string OrgUnitCode { get; init; } = string.Empty;
    public string OrgUnitName { get; init; } = string.Empty;

    /// <summary>GROUP (tổ) | SHIFT (kíp).</summary>
    public string OrgUnitTypeCode { get; init; } = string.Empty;

    /// <summary>Ca A/B/C của kíp.</summary>
    public string? Shift { get; init; }

    /// <summary>False = tổ/kíp đã ngừng trên sơ đồ tổ chức.</summary>
    public bool IsOrgUnitActive { get; init; }

    /// <summary>Đội chứa tổ (đơn vị TEAM gần nhất phía trên), nếu có.</summary>
    public int? TeamId { get; init; }

    public string? TeamName { get; init; }
    public int? WorkshopId { get; init; }
    public string? WorkshopName { get; init; }

    public string DisplayName { get; init; } = string.Empty;
    public string CodePrefix { get; init; } = string.Empty;

    /// <summary>HC | KIP.</summary>
    public string LaborType { get; init; } = string.Empty;

    public int SortOrder { get; init; }
    public bool IsActive { get; init; }

    /// <summary>Kỹ sư đang phụ trách.</summary>
    public IReadOnlyList<WorkReportUnitEngineerDto> Engineers { get; init; } = [];

    /// <summary>Người đang gọi được sửa cấu hình đơn vị (admin hoặc quản đốc/phó của xưởng).</summary>
    public bool CanConfigure { get; init; }

    /// <summary>Người đang gọi được đổi kỹ sư phụ trách.</summary>
    public bool CanManageEngineers { get; init; }
}

/// <summary>Tổ/kíp đang hoạt động trên sơ đồ nhưng chưa có đơn vị báo cáo, kèm gợi ý để xác nhận nhanh.</summary>
public class UnconfiguredOrgUnitDto
{
    public int OrgUnitId { get; init; }
    public string OrgUnitCode { get; init; } = string.Empty;
    public string OrgUnitName { get; init; } = string.Empty;
    public string OrgUnitTypeCode { get; init; } = string.Empty;
    public string? Shift { get; init; }
    public string? TeamName { get; init; }
    public int WorkshopId { get; init; }
    public string WorkshopName { get; init; } = string.Empty;
    public string SuggestedDisplayName { get; init; } = string.Empty;
    public string SuggestedCodePrefix { get; init; } = string.Empty;
    public string SuggestedLaborType { get; init; } = string.Empty;
}

// ===== Request =====

public abstract class WorkReportUnitRequestBase
{
    /// <summary>Để trống = lấy tên tổ/kíp trên sơ đồ.</summary>
    public string? DisplayName { get; set; }

    public string CodePrefix { get; set; } = string.Empty;

    /// <summary>HC | KIP.</summary>
    public string LaborType { get; set; } = string.Empty;
}

public class CreateWorkReportUnitRequest : WorkReportUnitRequestBase
{
    /// <summary>OrgUnit.Id của tổ (GROUP) hoặc kíp (SHIFT).</summary>
    public int OrgUnitId { get; set; }

    /// <summary>Null = xếp cuối xưởng.</summary>
    public int? SortOrder { get; set; }
}

public class UpdateWorkReportUnitRequest : WorkReportUnitRequestBase
{
    public bool IsActive { get; set; } = true;
}

/// <summary>Sắp xếp lại đơn vị của 1 xưởng: OrderedIds = toàn bộ Id đơn vị báo cáo của xưởng theo thứ tự mới.</summary>
public class ReorderWorkReportUnitsRequest
{
    public int WorkshopId { get; set; }
    public List<int> OrderedIds { get; set; } = [];
}

public class WorkReportUnitFilterRequest
{
    public int? WorkshopId { get; set; }
    public bool IncludeInactive { get; set; }
}