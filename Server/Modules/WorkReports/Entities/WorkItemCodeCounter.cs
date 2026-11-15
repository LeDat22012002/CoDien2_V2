namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// STT lớn nhất đã cấp theo (form, đầu mục). Số đã cấp không dùng lại kể cả khi xóa dòng hoặc đổi đầu mục.
/// Đọc bằng UPDLOCK, HOLDLOCK trong transaction để 2 người thêm dòng cùng lúc không trùng số.
/// </summary>
public class WorkItemCodeCounter
{
    public int WeeklyFormId { get; set; }

    public int WorkCategoryId { get; set; }

    public int LastSeq { get; set; }
}
