namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// Người thực hiện của dòng công việc. Bảng con, xóa cứng (lưu dòng là ghi lại cả danh sách).
/// EmployeeId null = tên gõ tự do; có Id thì hiển thị tên hiện tại của nhân viên.
/// </summary>
public class WorkItemWorker
{
    public int Id { get; set; }

    public int WorkItemId { get; set; }

    public int? EmployeeId { get; set; }

    /// <summary>Tên lúc nhập (bắt buộc); dùng khi gõ tự do hoặc nhân viên không còn.</summary>
    public string DisplayName { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public WorkItem WorkItem { get; set; } = null!;
}
