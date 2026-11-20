using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Trang công khai: lưới việc trong 1 ngày (tab "Hôm nay") và phân tích kế hoạch – thực hiện của 1 tuần (tab "Phân tích")
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
    public Task<DailyWorkDto<WeeklyReportFormDto>> GetDailyReportAsync(DateOnly date, CancellationToken cancellationToken) =>
        GetDailyAsync<WeeklyReportFormDto>(
            date,
            WorkReportPhases.Report,
            reportService.GetGridAsync,
            form =>
            {
                var items = form.Items.Where(x => Covers(x, date)).ToList();
                form.Items = items;
                form.Suggestions = [];
                form.ItemCount = items.Count;
                form.TotalPlannedMinutes = items.Sum(x => x.PlannedMinutes ?? 0);
                form.TotalActualMinutes = items.Sum(x => x.EffectiveActualMinutes);
                return items.Count;
            },
            cancellationToken);

    public Task<DailyWorkDto<WeeklyPlanFormDto>> GetDailyPlanAsync(DateOnly date, CancellationToken cancellationToken) =>
        GetDailyAsync<WeeklyPlanFormDto>(
            date,
            WorkReportPhases.Plan,
            planService.GetGridAsync,
            form =>
            {
                var items = form.Items.Where(x => Covers(x, date)).ToList();
                var total = items.Sum(x => x.PlannedMinutes ?? 0);
                form.Items = items;
                form.ItemCount = items.Count;
                form.TotalPlannedMinutes = total;
                form.TotalActualMinutes = total;
                return items.Count;
            },
            cancellationToken);

    public async Task<WorkReportDashboardDto> GetDashboardAsync(
        WorkReportDashboardRequest request, CancellationToken cancellationToken)
    {
        var week = request.WeekId is { } weekId
            ? await weekService.GetByIdAsync(weekId, null, cancellationToken)
            : (await weekService.GetWorkingWeeksAsync(null, cancellationToken)).ReportWeek;

        var categories = new Dictionary<int, WorkCategoryDto>();
        var workshops = new List<DashboardWorkshopDto>();
        foreach (var workshop in await GetWorkshopsAsync(cancellationToken))
        {
            var gridRequest = new WorkReportGridRequest { WorkshopId = workshop.WorkshopId, WeekId = week.Id };

            // Kế hoạch của chính tuần: form kế hoạch (kể cả dòng chưa đưa vào báo cáo)
            var planGrid = await planService.GetGridAsync(gridRequest, cancellationToken);
            var planItems = planGrid.Forms.SelectMany(x => x.Items).ToList();
            var planMaterials = await planMaterialRepository.GetByFormIdsAsync(
                planGrid.Forms.Select(x => x.FormId).ToList(), cancellationToken);

            // Thực hiện: form báo cáo (gồm dòng phát sinh)
            var reportGrid = await reportService.GetGridAsync(gridRequest, cancellationToken);
            reportGrid.Categories.ToList().ForEach(x => categories.TryAdd(x.Id, x));
            var reportItems = reportGrid.Forms.SelectMany(x => x.Items).ToList();
            var reportMaterials = await reportMaterialRepository.GetByFormIdsAsync(
                reportGrid.Forms.Select(x => x.FormId).ToList(), cancellationToken);

            var plannedMinutes = planItems.Sum(x => x.PlannedMinutes ?? 0);
            var actualMinutes = reportItems.Sum(x => x.EffectiveActualMinutes);

            workshops.Add(new DashboardWorkshopDto
            {
                WorkshopId = workshop.WorkshopId,
                WorkshopName = workshop.WorkshopName,
                PlannedItemCount = planItems.Count,
                ActualItemCount = reportItems.Count,
                UnplannedItemCount = reportItems.Count(x => x.IsUnplanned),
                PlannedMaterialCodeCount = WeeklyFormService.CountMaterialCodes(
                    planMaterials.Select(x => new SummaryMaterial(x.WeeklyFormId, x.MaterialCode, x.MaterialName))),
                // Số lượng thực tế trống = bằng kế hoạch; = 0 nghĩa là dự kiến nhưng không dùng → không đếm
                ActualMaterialCodeCount = WeeklyFormService.CountMaterialCodes(
                    reportMaterials
                        .Where(x => (x.ActualQuantity ?? x.PlannedQuantity) != 0)
                        .Select(x => new SummaryMaterial(x.WeeklyFormId, x.MaterialCode, x.MaterialName))),
                PlannedMinutes = plannedMinutes,
                ActualMinutes = actualMinutes,
                CompletionPercent = plannedMinutes > 0 ? Math.Round(actualMinutes / plannedMinutes * 100, 1) : null,
                Categories = reportItems
                    .GroupBy(x => x.WorkCategoryId)
                    .Select(g =>
                    {
                        var minutes = g.Sum(x => x.EffectiveActualMinutes);
                        return new DashboardCategoryMinutesDto
                        {
                            CategoryId = g.Key,
                            Minutes = minutes,
                            Percent = actualMinutes > 0 ? Math.Round(minutes / actualMinutes * 100, 1) : 0,
                        };
                    })
                    .Where(x => x.Minutes > 0)
                    .ToList(),
            });
        }

        var usedCategoryIds = workshops
            .SelectMany(x => x.Categories)
            .Select(x => x.CategoryId)
            .ToHashSet();

        return new WorkReportDashboardDto
        {
            Week = week,
            Categories = categories.Values
                .Where(x => usedCategoryIds.Contains(x.Id))
                .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                .ToList(),
            Workshops = workshops,
        };
    }

    /// <summary>
    /// Lưới từng xưởng của tuần chứa date; keepDayItems lọc dòng của form về ngày date (tính lại số dòng, tổng phút)
    /// và trả số dòng còn lại. Bỏ tổ/kíp không có việc trong ngày.
    /// </summary>
    private async Task<DailyWorkDto<TForm>> GetDailyAsync<TForm>(
        DateOnly date,
        string phase,
        Func<WorkReportGridRequest, CancellationToken, Task<WorkGridDto<TForm>>> getGrid,
        Func<TForm, int> keepDayItems,
        CancellationToken cancellationToken)
        where TForm : WeeklyFormDto
    {
        var week = await FindWeekAsync(date, cancellationToken);
        if (week is null)
        {
            return new DailyWorkDto<TForm> { Date = date, Phase = phase };
        }

        var result = new List<DailyWorkshopDto<TForm>>();
        foreach (var workshop in await GetWorkshopsAsync(cancellationToken))
        {
            var grid = await getGrid(
                new WorkReportGridRequest { WorkshopId = workshop.WorkshopId, WeekId = week.Id }, cancellationToken);
            var forms = grid.Forms.Where(form => keepDayItems(form) > 0).ToList();

            result.Add(new DailyWorkshopDto<TForm>
            {
                WorkshopId = workshop.WorkshopId,
                WorkshopName = workshop.WorkshopName,
                ItemCount = forms.Sum(x => x.ItemCount),
                Grid = new WorkGridDto<TForm>
                {
                    WorkshopId = grid.WorkshopId,
                    WorkshopName = grid.WorkshopName,
                    Phase = grid.Phase,
                    Title = grid.Title,
                    Week = grid.Week,
                    Categories = grid.Categories,
                    Forms = forms,
                },
            });
        }

        return new DailyWorkDto<TForm>
        {
            Date = date,
            Phase = phase,
            Week = await weekService.GetByIdAsync(week.Id, null, cancellationToken),
            Workshops = result,
        };
    }

    /// <summary>Khoảng ngày làm phủ ngày đang xem (việc kéo dài nhiều ngày vẫn hiện).</summary>
    private static bool Covers(WorkItemDtoBase item, DateOnly date) =>
        item.StartDate <= date && date <= item.EndDate;

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
}