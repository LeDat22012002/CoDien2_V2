using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Shared.Extensions;

namespace Server.Modules.WorkReports.Validators;

public static class WorkWeekRequestValidator
{
    /// <summary>Hạn chỉnh tay phải nằm quanh tuần để tránh gõ nhầm năm/tháng.</summary>
    private const int MaxDaysAroundWeek = 21;

    public static void Validate(UpdateWorkWeekDeadlineRequest request, WorkWeek week)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.WorkshopId is null && !request.ResetToDefault
            && (request.PlanDeadlineAt is null || request.ReportDeadlineAt is null))
        {
            errors["deadline"] = ["Hạn chung của tuần cần nhập đủ hạn kế hoạch và hạn báo cáo."];
        }

        var weekStart = week.StartDate.ToDateTime(TimeOnly.MinValue);
        var weekEnd = week.EndDate.ToDateTime(TimeOnly.MaxValue);

        // Kế hoạch tuần N được lập trong tuần N−1 nên hạn có thể trước thứ 2 của tuần
        if (request.PlanDeadlineAt is { } planDeadline
            && (planDeadline < weekStart.AddDays(-MaxDaysAroundWeek) || planDeadline > weekEnd))
        {
            errors["planDeadlineAt"] =
                [$"Hạn kế hoạch phải từ {weekStart.AddDays(-MaxDaysAroundWeek):dd/MM/yyyy} đến hết ngày {week.EndDate:dd/MM/yyyy}."];
        }

        if (request.ReportDeadlineAt is { } reportDeadline
            && (reportDeadline < weekStart || reportDeadline > weekEnd.AddDays(MaxDaysAroundWeek)))
        {
            errors["reportDeadlineAt"] =
                [$"Hạn báo cáo phải từ {week.StartDate:dd/MM/yyyy} đến hết ngày {weekEnd.AddDays(MaxDaysAroundWeek):dd/MM/yyyy}."];
        }

        errors.ThrowIfInvalid();
    }
}