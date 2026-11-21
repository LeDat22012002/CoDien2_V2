namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// STT lớn nhất đã cấp theo (form, giai đoạn, đầu mục). Số đã cấp không dùng lại kể cả khi xóa dòng hoặc đổi đầu mục.
/// Kế hoạch và báo cáo đánh mã riêng: dòng báo cáo (kể cả dòng đưa từ kế hoạch sang) nhận số tiếp theo của báo cáo
/// lúc vào báo cáo, nên nhập mới / dùng gợi ý xen kẽ vẫn liền số, không nhảy theo mã kế hoạch.
/// Đọc bằng UPDLOCK, HOLDLOCK trong transaction để 2 người thêm dòng cùng lúc không trùng số.
/// </summary>
public class WorkItemCodeCounter
{
    public int WeeklyFormId { get; set; }

    /// <summary>PLAN | REPORT (<see cref="WorkReportPhases"/>).</summary>
    public string Phase { get; set; } = WorkReportPhases.Plan;

    public int WorkCategoryId { get; set; }

    public int LastSeq { get; set; }
}