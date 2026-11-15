namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class WorkMaterialDto
{
    public int Id { get; init; }
    public int WeeklyFormId { get; init; }
    public string UnitName { get; init; } = string.Empty;
    public int WorkItemId { get; init; }

    /// <summary>Mã CV của dòng công việc.</summary>
    public string WorkItemCode { get; init; } = string.Empty;

    public string? WorkItemDescription { get; init; }

    /// <summary>KTV phụ trách (theo form).</summary>
    public string? EngineerNames { get; init; }

    public string? MaterialCode { get; init; }
    public string MaterialName { get; init; } = string.Empty;
    public string? Uom { get; init; }
    public decimal? PlannedQuantity { get; init; }

    /// <summary>Giá trị đã nhập (null = bằng kế hoạch).</summary>
    public decimal? ActualQuantity { get; init; }

    /// <summary>Thực tế, trống thì bằng kế hoạch.</summary>
    public decimal? EffectiveActualQuantity { get; init; }

    public DateOnly? UsageDate { get; init; }
    public int? MaterialPurposeId { get; init; }
    public string? MaterialPurposeCode { get; init; }
    public string? Note { get; init; }
    public bool IsUnplanned { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public string? UpdatedBy { get; init; }
}

// ===== Request =====

/// <summary>
/// Vật tư gắn 1 dòng công việc của form. Trường không thuộc giai đoạn bị bỏ qua:
/// PLAN nhận số lượng kế hoạch; REPORT nhận số lượng thực tế (vật tư phát sinh không có số kế hoạch).
/// </summary>
public abstract class WorkMaterialRequestBase
{
    public int WorkItemId { get; set; }
    public string? MaterialCode { get; set; }
    public string MaterialName { get; set; } = string.Empty;
    public string? Uom { get; set; }
    public decimal? PlannedQuantity { get; set; }
    public decimal? ActualQuantity { get; set; }
    public DateOnly? UsageDate { get; set; }
    public int? MaterialPurposeId { get; set; }
    public string? Note { get; set; }
}

public class CreateWorkMaterialRequest : WorkMaterialRequestBase;

public class UpdateWorkMaterialRequest : WorkMaterialRequestBase;

public class WorkshopMaterialFilterRequest
{
    public int WorkshopId { get; set; }
    public int WeekId { get; set; }

    /// <summary>PLAN | REPORT.</summary>
    public string Phase { get; set; } = string.Empty;
}
