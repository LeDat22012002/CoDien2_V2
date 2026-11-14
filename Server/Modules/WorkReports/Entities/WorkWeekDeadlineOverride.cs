using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

/// <summary>Hạn riêng của 1 xưởng trong 1 tuần (null = theo hạn chung của tuần). Mỗi (tuần, xưởng) tối đa 1 dòng.</summary>
public class WorkWeekDeadlineOverride : BaseEntity
{
    public int WorkWeekId { get; set; }

    /// <summary>OrgUnit.Id của xưởng.</summary>
    public int WorkshopId { get; set; }

    public DateTime? PlanDeadlineAt { get; set; }

    public DateTime? ReportDeadlineAt { get; set; }

    public WorkWeek WorkWeek { get; set; } = null!;
}