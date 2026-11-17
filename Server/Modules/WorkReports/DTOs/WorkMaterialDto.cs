namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

/// <summary>Vật tư kế hoạch (WorkItemId = Id dòng kế hoạch) hoặc báo cáo (WorkItemId = Id dòng báo cáo).</summary>
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

    /// <summary>Báo cáo: vật tư phát sinh (không chép từ kế hoạch).</summary>
    public bool IsUnplanned { get; init; }

    public DateTime? UpdatedAt { get; init; }

    /// <summary>Mã NV người sửa cuối (hoặc người tạo).</summary>
    public string? UpdatedBy { get; init; }

    /// <summary>Họ tên người sửa cuối.</summary>
    public string? UpdatedByName { get; set; }

    /// <summary>Base64, gửi lại khi sửa để phát hiện người khác đã sửa trước (409).</summary>
    public string RowVersion { get; init; } = string.Empty;
}

// ===== Request =====

/// <summary>
/// Vật tư gắn 1 dòng công việc cùng giai đoạn của form. Trường không thuộc giai đoạn bị bỏ qua:
/// kế hoạch nhận PlannedQuantity; báo cáo nhận ActualQuantity (số kế hoạch chỉ có khi chép từ kế hoạch).
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

public class UpdateWorkMaterialRequest : WorkMaterialRequestBase
{
    /// <summary>RowVersion (base64) nhận được lần đọc trước; lệch → 409 kèm vật tư mới nhất.</summary>
    public string RowVersion { get; set; } = string.Empty;
}

public class WorkshopMaterialFilterRequest
{
    public int WorkshopId { get; set; }
    public int WeekId { get; set; }
}
