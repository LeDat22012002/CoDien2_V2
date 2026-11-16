using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

/// <summary>Phần chung của vật tư kế hoạch / báo cáo (mỗi loại 1 bảng, gắn bắt buộc vào 1 dòng cùng loại).</summary>
public abstract class WorkMaterialBase : BaseEntity
{
    /// <summary>Form của dòng công việc (lưu thêm để lọc theo form/xưởng nhanh).</summary>
    public int WeeklyFormId { get; set; }

    public string? MaterialCode { get; set; }

    public string MaterialName { get; set; } = string.Empty;

    /// <summary>Đơn vị tính.</summary>
    public string? Uom { get; set; }

    public DateOnly? UsageDate { get; set; }

    public int? MaterialPurposeId { get; set; }

    public string? Note { get; set; }

    public MaterialPurpose? MaterialPurpose { get; set; }
}

/// <summary>Vật tư dự kiến của 1 dòng kế hoạch.</summary>
public class WorkPlanMaterial : WorkMaterialBase
{
    public int WorkPlanItemId { get; set; }

    /// <summary>Số lượng kế hoạch.</summary>
    public decimal? Quantity { get; set; }

    public WorkPlanItem WorkPlanItem { get; set; } = null!;
}

/// <summary>Vật tư thực tế của 1 dòng báo cáo; nhận gợi ý kế hoạch thì chép vật tư kế hoạch sang.</summary>
public class WorkReportMaterial : WorkMaterialBase
{
    public int WorkReportItemId { get; set; }

    /// <summary>Vật tư kế hoạch gốc; null = vật tư phát sinh.</summary>
    public int? PlanMaterialId { get; set; }

    /// <summary>Số lượng kế hoạch chụp lúc chép; null với vật tư phát sinh.</summary>
    public decimal? PlannedQuantity { get; set; }

    /// <summary>Số lượng thực tế; null = bằng kế hoạch.</summary>
    public decimal? ActualQuantity { get; set; }

    public WorkReportItem WorkReportItem { get; set; } = null!;
}
