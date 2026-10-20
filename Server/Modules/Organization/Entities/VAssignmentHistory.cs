namespace Server.Modules.Organization.Entities;

/// <summary>View dbo.vAssignmentHistory: lịch sử chức vụ / điều chuyển (chỉ đọc).</summary>
public class VAssignmentHistory
{
    public string EmpCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int AssignmentId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string ChangeType { get; set; } = string.Empty;
    public string? DecisionNo { get; set; }
    public string OrgUnitCode { get; set; } = string.Empty;
    public string OrgUnitName { get; set; } = string.Empty;
    public string LevelName { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public bool IsActing { get; set; }
    public bool IsPrimary { get; set; }
}
