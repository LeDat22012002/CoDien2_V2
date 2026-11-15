using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>Form đang thao tác kèm kỳ tuần, quyền người gọi và trạng thái 2 giai đoạn (WeeklyFormService tạo).</summary>
public sealed class WeeklyFormContext
{
    /// <summary>Không tracking.</summary>
    public required WeeklyForm Form { get; init; }

    public required WorkWeek Week { get; init; }

    public required WorkReportUnitAccessDto Access { get; init; }

    /// <summary>PLAN | REPORT đang thao tác.</summary>
    public required string Phase { get; init; }

    public required PhaseState PlanState { get; init; }

    public required PhaseState ReportState { get; init; }

    /// <summary>Thứ tự của đơn vị trong xưởng ở tuần này (1, 2…); 0 khi không tính.</summary>
    public int OrderNo { get; init; }

    public PhaseState State => Phase == WorkReportPhases.Plan ? PlanState : ReportState;

    public bool CanEditNow => WeeklyFormRules.CanEditNow(Access, State);

    public bool IsPlan => Phase == WorkReportPhases.Plan;
}
