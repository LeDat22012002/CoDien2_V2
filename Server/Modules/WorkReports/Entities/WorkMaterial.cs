using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// Vật tư sử dụng, gắn bắt buộc vào 1 dòng công việc (mã CV, KTV lấy theo dòng/form).
/// Kế hoạch nhập số lượng dự kiến; báo cáo nhập số thực tế (null = bằng kế hoạch) và thêm vật tư phát sinh.
/// </summary>
public class WorkMaterial : BaseEntity
{
    /// <summary>Form của dòng công việc (lưu thêm để lọc theo form/xưởng nhanh).</summary>
    public int WeeklyFormId { get; set; }

    public int WorkItemId { get; set; }

    public string? MaterialCode { get; set; }

    public string MaterialName { get; set; } = string.Empty;

    /// <summary>Đơn vị tính.</summary>
    public string? Uom { get; set; }

    public decimal? PlannedQuantity { get; set; }

    /// <summary>Null = bằng kế hoạch.</summary>
    public decimal? ActualQuantity { get; set; }

    public DateOnly? UsageDate { get; set; }

    public int? MaterialPurposeId { get; set; }

    public string? Note { get; set; }

    /// <summary>Thêm ở giai đoạn báo cáo.</summary>
    public bool IsUnplanned { get; set; }

    public WorkItem WorkItem { get; set; } = null!;

    public MaterialPurpose? MaterialPurpose { get; set; }
}
