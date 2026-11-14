using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// Kỹ sư phụ trách (KTV) một tổ/kíp, có lịch sử. Nhiều–nhiều: 1 kỹ sư phụ trách nhiều tổ, 1 kíp nhiều kỹ sư.
/// Độc lập với vị trí trên sơ đồ tổ chức: kỹ sư trên sơ đồ chỉ là gợi ý, phải được xác nhận
/// (tổ HC: đội trưởng/phó hoặc quản đốc/phó; kíp: quản đốc/phó).
/// </summary>
public class WorkReportUnitEngineer : BaseEntity
{
    public int WorkReportUnitId { get; set; }

    /// <summary>Employee.Id của kỹ sư.</summary>
    public int EmployeeId { get; set; }

    public DateOnly StartDate { get; set; }

    /// <summary>Null = đang phụ trách.</summary>
    public DateOnly? EndDate { get; set; }

    public WorkReportUnit WorkReportUnit { get; set; } = null!;
}