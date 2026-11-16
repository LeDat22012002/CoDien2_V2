namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// Dòng kế hoạch tuần. Thêm/sửa/xóa tự do trong hạn kế hoạch; hết hạn thì khóa, chỉ admin mở khóa.
/// Là gợi ý cho báo cáo tuần đó (chỉ người nhập báo cáo thấy) cho tới khi được đưa vào báo cáo.
/// </summary>
public class WorkPlanItem : WorkItemBase<WorkPlanItemWorker>
{
    /// <summary>(11) Giờ công kế hoạch (phút).</summary>
    public decimal? PlannedMinutes { get; set; }
}

public class WorkPlanItemWorker : WorkItemWorkerBase
{
    public int WorkPlanItemId { get; set; }

    public WorkPlanItem WorkPlanItem { get; set; } = null!;
}
