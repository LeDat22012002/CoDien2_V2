using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>Thao tác trên dòng / vật tư của 1 giai đoạn (kiểm tra quyền + trạng thái mở).</summary>
public enum WorkItemAction
{
    View,
    Create,
    Update,
    Delete,
}

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

    public bool IsPlan => Phase == WorkReportPhases.Plan;

    public PhaseState State => IsPlan ? PlanState : ReportState;

    /// <summary>Quyền thêm/sửa/xóa của người gọi ở giai đoạn đang thao tác (chưa tính mở/khóa).</summary>
    public WorkReportRightsDto Rights => IsPlan ? Access.Plan : Access.Report;

    public bool CanCreateNow => State.IsOpen && Rights.CanCreate;

    public bool CanUpdateNow => State.IsOpen && Rights.CanUpdate;

    public bool CanDeleteNow => State.IsOpen && Rights.CanDelete;

    public bool Can(WorkItemAction action) => action switch
    {
        WorkItemAction.Create => CanCreateNow,
        WorkItemAction.Update => CanUpdateNow,
        WorkItemAction.Delete => CanDeleteNow,
        _ => Access.CanView,
    };
}
