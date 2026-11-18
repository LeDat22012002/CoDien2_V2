using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Trang công khai: việc trong 1 ngày (tab "Hôm nay") và phân tích báo cáo tuần + kế hoạch tuần tới (tab "Phân tích")
/// của các xưởng công khai. Gọi sau IWorkReportScopeService.UsePublicViewAsync (phạm vi = xưởng công khai, chỉ xem).
/// Dùng lại lưới của từng xưởng (đã lọc quyền, map DTO) rồi lọc / cộng dồn.
/// </summary>
public class WorkReportDashboardService(
    IWorkReportScopeService scopeService,
    IWorkPlanService planService,
    IWorkReportService reportService,
    IWorkPlanMaterialRepository planMaterialRepository,
    IWorkReportMaterialRepository reportMaterialRepository,
    IWorkWeekRepository weekRepository,
    IWorkWeekService weekService) : IWorkReportDashboardService
{
    public Task<DailyWorkDto<WorkReportItemDto>> GetDailyReportAsync(DateOnly date, CancellationToken cancellationToken) =>
        GetDailyAsync<WeeklyReportFormDto, WorkReportItemDto>(
            date, WorkReportPhases.Report, reportService.GetGridAsync, form => form.Items, cancellationToken);

    public Task<DailyWorkDto<WorkPlanItemDto>> GetDailyPlanAsync(DateOnly date, CancellationToken cancellationToken) =>
        GetDailyAsync<WeeklyPlanFormDto, WorkPlanItemDto>(
            date, WorkReportPhases.Plan, planService.GetGridAsync, form => form.Items, cancellationToken);

    public async Task<WorkReportDashboardDto> GetDashboardAsync(
        WorkReportDashboardRequest request, CancellationToken cancellationToken)
    {
        var reportWeek = request.WeekId is { } weekId
            ? await weekService.GetByIdAsync(weekId, null, cancellationToken)
            : (await weekService.GetWorkingWeeksAsync(null, cancellationToken)).ReportWeek;
        var nextWeek = await FindWeekAsync(reportWeek.StartDate.AddDays(7), cancellationToken);
        var planWeek = nextWeek is null ? null : await weekService.GetByIdAsync(nextWeek.Id, null, cancellationToken);

        var categories = new Dictionary<int, WorkCategoryDto>();
        var workshops = new List<DashboardWorkshopDto>();
        foreach (var workshop in await GetWorkshopsAsync(cancellationToken))
        {
            var reportGrid = await reportService.GetGridAsync(
                new WorkReportGridRequest { WorkshopId = workshop.WorkshopId, WeekId = reportWeek.Id }, cancellationToken);
            reportGrid.Categories.ToList().ForEach(x => categories.TryAdd(x.Id, x));
            var reportItems = reportGrid.Forms.SelectMany(x => x.Items).ToList();
            var reportMaterials = await reportMaterialRepository.GetByFormIdsAsync(
                reportGrid.Forms.Select(x => x.FormId).ToList(), cancellationToken);

            var report = BuildStats(
                reportItems.Select(x => (x.WorkCategoryId, x.PlannedMinutes ?? 0, x.EffectiveActualMinutes)).ToList(),
                reportItems.Count(x => x.IsUnplanned),
                reportGrid.Forms.Sum(x => x.CapacityMinutes),
                reportMaterials.Select(x => new SummaryMaterial(x.WeeklyFormId, x.MaterialCode, x.MaterialName)).ToList());

            var plan = new DashboardWeekStatsDto();
            if (planWeek is not null)
            {
                var planGrid = await planService.GetGridAsync(
                    new WorkReportGridRequest { WorkshopId = workshop.WorkshopId, WeekId = planWeek.Id }, cancellationToken);
                planGrid.Categories.ToList().ForEach(x => categories.TryAdd(x.Id, x));
                var planItems = planGrid.Forms.SelectMany(x => x.Items).ToList();
                var planMaterials = await planMaterialRepository.GetByFormIdsAsync(
                    planGrid.Forms.Select(x => x.FormId).ToList(), cancellationToken);
                plan = BuildStats(
                    planItems.Select(x => (x.WorkCategoryId, x.PlannedMinutes ?? 0, x.PlannedMinutes ?? 0)).ToList(),
                    0,
                    planGrid.Forms.Sum(x => x.CapacityMinutes),
                    planMaterials.Select(x => new SummaryMaterial(x.WeeklyFormId, x.MaterialCode, x.MaterialName)).ToList());
            }

            workshops.Add(new DashboardWorkshopDto
            {
                WorkshopId = workshop.WorkshopId,
                WorkshopName = workshop.WorkshopName,
                Report = report,
                Plan = plan,
            });
        }

        var usedCategoryIds = workshops
            .SelectMany(x => x.Report.Categories.Concat(x.Plan.Categories))
            .Select(x => x.CategoryId)
            .ToHashSet();

        return new WorkReportDashboardDto
        {
            ReportWeek = reportWeek,
            PlanWeek = planWeek,
            Categories = categories.Values
                .Where(x => usedCategoryIds.Contains(x.Id))
                .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                .ToList(),
            Workshops = workshops,
        };
    }

    private async Task<DailyWorkDto<TItem>> GetDailyAsync<TForm, TItem>(
        DateOnly date,
        string phase,
        Func<WorkReportGridRequest, CancellationToken, Task<WorkGridDto<TForm>>> getGrid,
        Func<TForm, IReadOnlyList<TItem>> itemsOf,
        CancellationToken cancellationToken)
        where TForm : WeeklyFormDto
        where TItem : WorkItemDtoBase
    {
        var week = await FindWeekAsync(date, cancellationToken);
        if (week is null)
        {
            return new DailyWorkDto<TItem> { Date = date, Phase = phase };
        }

        var result = new List<DailyWorkshopDto<TItem>>();
        foreach (var workshop in await GetWorkshopsAsync(cancellationToken))
        {
            var grid = await getGrid(
                new WorkReportGridRequest { WorkshopId = workshop.WorkshopId, WeekId = week.Id }, cancellationToken);
            var units = grid.Forms
                .Select(form => new DailyUnitDto<TItem>
                {
                    FormId = form.FormId,
                    UnitId = form.UnitId,
                    OrderLabel = form.OrderLabel,
                    UnitName = form.UnitName,
                    EngineerNames = form.EngineerNames,
                    // Khoảng ngày làm phủ ngày đang xem (việc kéo dài nhiều ngày vẫn hiện)
                    Items = itemsOf(form).Where(x => x.StartDate <= date && date <= x.EndDate).ToList(),
                })
                .Where(x => x.Items.Count > 0)
                .ToList();

            result.Add(new DailyWorkshopDto<TItem>
            {
                WorkshopId = workshop.WorkshopId,
                WorkshopName = workshop.WorkshopName,
                ItemCount = units.Sum(x => x.Items.Count),
                Units = units,
            });
        }

        return new DailyWorkDto<TItem>
        {
            Date = date,
            Phase = phase,
            Week = await weekService.GetByIdAsync(week.Id, null, cancellationToken),
            Workshops = result,
        };
    }

    /// <summary>Xưởng công khai (theo thứ tự sơ đồ).</summary>
    private async Task<IReadOnlyList<WorkReportScopeWorkshopDto>> GetWorkshopsAsync(CancellationToken cancellationToken)
    {
        var scope = await scopeService.GetScopeAsync(cancellationToken);
        if (!scope.CanViewFactory)
        {
            throw new ForbiddenException("Chỉ dùng cho trang công khai.");
        }

        return (await scopeService.GetMyScopeAsync(cancellationToken)).Workshops;
    }

    private async Task<WorkWeek?> FindWeekAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var monday = WorkWeekCalculator.GetMonday(date);
        return (await weekRepository.GetByStartDateRangeAsync(monday, monday, cancellationToken)).FirstOrDefault();
    }

    private static DashboardWeekStatsDto BuildStats(
        IReadOnlyList<(int CategoryId, decimal Planned, decimal Actual)> items,
        int unplannedCount,
        decimal capacityMinutes,
        IReadOnlyList<SummaryMaterial> materials)
    {
        var planned = items.Sum(x => x.Planned);
        var actual = items.Sum(x => x.Actual);
        return new DashboardWeekStatsDto
        {
            ItemCount = items.Count,
            UnplannedCount = unplannedCount,
            PlannedMinutes = planned,
            ActualMinutes = actual,
            CompletionPercent = planned > 0 ? Math.Round(actual / planned * 100, 1) : null,
            CapacityMinutes = capacityMinutes,
            MaterialCodeCount = WeeklyFormService.CountMaterialCodes(materials),
            MaterialLineCount = materials.Count,
            Categories = items
                .GroupBy(x => x.CategoryId)
                .Select(g =>
                {
                    var minutes = g.Sum(x => x.Actual);
                    return new DashboardCategoryMinutesDto
                    {
                        CategoryId = g.Key,
                        Minutes = minutes,
                        Percent = actual > 0 ? Math.Round(minutes / actual * 100, 1) : 0,
                    };
                })
                .ToList(),
        };
    }
}
