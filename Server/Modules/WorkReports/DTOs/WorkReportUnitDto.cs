namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class WorkReportUnitDto
{
    public int Id { get; init; }

    /// <summary>Đơn vị gốc trên sơ đồ: tổ/kíp; đơn vị tự đặt thì là đội / xưởng chứa nó.</summary>
    public int OrgUnitId { get; init; }

    public string OrgUnitCode { get; init; } = string.Empty;
    public string OrgUnitName { get; init; } = string.Empty;

    /// <summary>GROUP (tổ) | SHIFT (kíp); đơn vị tự đặt: TEAM / loại của xưởng.</summary>
    public string OrgUnitTypeCode { get; init; } = string.Empty;

    /// <summary>True = đơn vị tự đặt (không phải tổ/kíp trên sơ đồ).</summary>
    public bool IsCustom { get; init; }

    /// <summary>Ca A/B/C của kíp.</summary>
    public string? Shift { get; init; }

    /// <summary>False = đơn vị gốc đã ngừng trên sơ đồ tổ chức.</summary>
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

/// <summary>Chỗ gắn đơn vị tự đặt: xưởng hoặc 1 đội trong xưởng.</summary>
public class WorkReportUnitParentOptionDto
{
    public int OrgUnitId { get; init; }
    public string Name { get; init; } = string.Empty;
    public bool IsWorkshop { get; init; }
}

// ===== Request =====

public abstract class WorkReportUnitRequestBase
{
    /// <summary>Đơn vị theo sơ đồ: để trống = lấy tên tổ/kíp. Đơn vị tự đặt: bắt buộc.</summary>
    public string? DisplayName { get; set; }

    public string CodePrefix { get; set; } = string.Empty;

    /// <summary>HC | KIP.</summary>
    public string LaborType { get; set; } = string.Empty;
}

/// <summary>Thêm đơn vị tự đặt (tổ/kíp trên sơ đồ được tạo tự động).</summary>
public class CreateWorkReportUnitRequest : WorkReportUnitRequestBase
{
    /// <summary>OrgUnit.Id của xưởng hoặc đội chứa đơn vị (đội trưởng/phó của đội đó cùng quản lý).</summary>
    public int ParentOrgUnitId { get; set; }
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