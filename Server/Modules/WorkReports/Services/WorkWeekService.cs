using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Kỳ tuần và hạn nộp. Mặc định: báo cáo tuần N và kế hoạch tuần N+1 cùng khóa lúc thứ 2 (tuần N+1) 11:00.
/// Hạn chung lưu trên WorkWeek, hạn riêng xưởng lưu ở WorkWeekDeadlineOverride (null = theo hạn chung).
/// </summary>
public class WorkWeekService(
    IWorkWeekRepository weekRepository,
    IWorkReportSettingRepository settingRepository,
    IOrgTreeProvider orgTreeProvider,
    IUnitOfWork unitOfWork,
    ILogger<WorkWeekService> logger) : IWorkWeekService
{
    private const string NotFoundMessage = "Không tìm thấy kỳ tuần.";

    /// <summary>Năm ISO được tự tạo đủ tuần khi xem danh sách (năm trước, năm nay, năm sau).</summary>
    private const int EnsureYearRange = 1;

    public async Task EnsureWeeksAsync(DateOnly fromDate, int weekCount, CancellationToken cancellationToken)
    {
        if (weekCount <= 0)
        {
            return;
        }

        var fromMonday = WorkWeekCalculator.GetMonday(fromDate);
        var toMonday = fromMonday.AddDays(7 * (weekCount - 1));
        var existing = (await weekRepository.GetByStartDateRangeAsync(fromMonday, toMonday, cancellationToken))
            .Select(x => x.StartDate)
            .ToHashSet();

        var missingMondays = Enumerable.Range(0, weekCount)
            .Select(i => fromMonday.AddDays(7 * i))
            .Where(x => !existing.Contains(x))
            .ToList();
        if (missingMondays.Count == 0)
        {
            return;
        }

        var setting = await settingRepository.GetAsync(cancellationToken);
        var weeks = missingMondays.Select(x => WorkWeekCalculator.Create(x, setting)).ToList();
        foreach (var week in weeks)
        {
            weekRepository.Add(week);
        }

        try
        {
            await unitOfWork.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Đã tạo {Count} kỳ tuần từ {From:dd/MM/yyyy}", weeks.Count, missingMondays[0]);
        }
        catch (DbUpdateException ex)
        {
            // Tác vụ nền và request tạo cùng lúc → trùng (IsoYear, IsoWeek); bản kia đã tạo nên bỏ qua
            weekRepository.Detach(weeks);
            logger.LogWarning(ex, "Kỳ tuần đã được tiến trình khác tạo, bỏ qua");
        }
    }

    public async Task<IReadOnlyList<WorkWeekDto>> GetListAsync(
        WorkWeekFilterRequest filter, CancellationToken cancellationToken)
    {
        var (currentYear, _) = WorkWeekCalculator.GetIsoWeek(WorkWeekCalculator.GetMonday(Today));
        var year = filter.Year ?? currentYear;

        if (Math.Abs(year - currentYear) <= EnsureYearRange)
        {
            var firstMonday = DateOnly.FromDateTime(ISOWeek.ToDateTime(year, 1, DayOfWeek.Monday));
            await EnsureWeeksAsync(firstMonday, ISOWeek.GetWeeksInYear(year), cancellationToken);
        }

        var weeks = await weekRepository.GetByIsoYearAsync(year, cancellationToken);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);

        return weeks.Select(x => ToDto(x, filter.WorkshopId, tree)).ToList();
    }

    public async Task<WorkWeekDto> GetByIdAsync(int id, int? workshopId, CancellationToken cancellationToken)
    {
        var week = await weekRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);

        return ToDto(week, workshopId, tree);
    }

    public async Task<WorkingWeeksDto> GetWorkingWeeksAsync(int? workshopId, CancellationToken cancellationToken)
    {
        var now = DateTime.Now;
        var currentMonday = WorkWeekCalculator.GetMonday(DateOnly.FromDateTime(now));
        var previousMonday = currentMonday.AddDays(-7);

        await EnsureWeeksAsync(previousMonday, 3, cancellationToken);

        var weeks = (await weekRepository.GetByStartDateRangeAsync(
                previousMonday, currentMonday.AddDays(7), cancellationToken))
            .ToDictionary(x => x.StartDate);
        if (weeks.Count < 3)
        {
            throw new BusinessException("Chưa tạo được kỳ tuần, vui lòng thử lại.");
        }

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var previous = weeks[previousMonday];

        // Sáng thứ 2 trước hạn: báo cáo tuần trước còn mở, kế hoạch đang lập là tuần này
        var (_, previousReportDeadline) = GetEffectiveDeadlines(previous, workshopId);
        var isPreviousReportOpen = now <= previousReportDeadline;
        var reportWeek = isPreviousReportOpen ? previous : weeks[currentMonday];
        var planWeek = isPreviousReportOpen ? weeks[currentMonday] : weeks[currentMonday.AddDays(7)];

        return new WorkingWeeksDto
        {
            Now = now,
            ReportWeek = ToDto(reportWeek, workshopId, tree),
            PlanWeek = ToDto(planWeek, workshopId, tree),
        };
    }

    public async Task<WorkWeekDto> UpdateDeadlineAsync(
        int id, UpdateWorkWeekDeadlineRequest request, CancellationToken cancellationToken)
    {
        var week = await weekRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        WorkWeekRequestValidator.Validate(request, week);

        if (request.WorkshopId is not { } workshopId)
        {
            if (request.ResetToDefault)
            {
                var setting = await settingRepository.GetAsync(cancellationToken);
                week.PlanDeadlineAt = WorkWeekCalculator.GetPlanDeadline(week.StartDate, setting);
                week.ReportDeadlineAt = WorkWeekCalculator.GetReportDeadline(week.StartDate, setting);
                week.IsDeadlineCustomized = false;
            }
            else
            {
                week.PlanDeadlineAt = request.PlanDeadlineAt!.Value;
                week.ReportDeadlineAt = request.ReportDeadlineAt!.Value;
                week.IsDeadlineCustomized = true;
            }
        }
        else
        {
            var tree = await orgTreeProvider.GetAsync(cancellationToken);
            if (tree.GetWorkshops().All(x => x.Id != workshopId))
            {
                throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
                {
                    ["workshopId"] = ["Xưởng không tồn tại hoặc đã ngừng hoạt động."],
                });
            }

            var deadlineOverride = week.DeadlineOverrides.FirstOrDefault(x => x.WorkshopId == workshopId);
            var hasDeadline = request.PlanDeadlineAt is not null || request.ReportDeadlineAt is not null;

            if (!hasDeadline || request.ResetToDefault)
            {
                // Bỏ hạn riêng → xưởng theo hạn chung
                if (deadlineOverride is not null)
                {
                    weekRepository.RemoveOverride(deadlineOverride);
                }
            }
            else if (deadlineOverride is null)
            {
                weekRepository.AddOverride(new WorkWeekDeadlineOverride
                {
                    WorkWeekId = week.Id,
                    WorkshopId = workshopId,
                    PlanDeadlineAt = request.PlanDeadlineAt,
                    ReportDeadlineAt = request.ReportDeadlineAt,
                });
            }
            else
            {
                deadlineOverride.PlanDeadlineAt = request.PlanDeadlineAt;
                deadlineOverride.ReportDeadlineAt = request.ReportDeadlineAt;
            }
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, request.WorkshopId, cancellationToken);
    }

    public async Task RecalculateDefaultDeadlinesAsync(WorkReportSetting setting, CancellationToken cancellationToken)
    {
        var now = DateTime.Now;
        var weeks = await weekRepository.FindNotCustomizedWithFutureDeadlineAsync(now, cancellationToken);

        // Hạn đã qua giữ nguyên (tuần đó đã khóa theo hạn cũ)
        foreach (var week in weeks)
        {
            if (week.PlanDeadlineAt > now)
            {
                week.PlanDeadlineAt = WorkWeekCalculator.GetPlanDeadline(week.StartDate, setting);
            }

            if (week.ReportDeadlineAt > now)
            {
                week.ReportDeadlineAt = WorkWeekCalculator.GetReportDeadline(week.StartDate, setting);
            }
        }
    }

    /// <summary>Hạn áp dụng cho xưởng: hạn riêng (nếu có) → hạn chung của tuần.</summary>
    public static (DateTime Plan, DateTime Report) GetEffectiveDeadlines(WorkWeek week, int? workshopId)
    {
        var deadlineOverride = workshopId is { } id
            ? week.DeadlineOverrides.FirstOrDefault(x => x.WorkshopId == id && !x.IsDeleted)
            : null;

        return (deadlineOverride?.PlanDeadlineAt ?? week.PlanDeadlineAt,
            deadlineOverride?.ReportDeadlineAt ?? week.ReportDeadlineAt);
    }

    private static WorkWeekDto ToDto(WorkWeek week, int? workshopId, OrgTree tree)
    {
        var (effectivePlan, effectiveReport) = GetEffectiveDeadlines(week, workshopId);

        return new WorkWeekDto
        {
            Id = week.Id,
            IsoYear = week.IsoYear,
            IsoWeek = week.IsoWeek,
            StartDate = week.StartDate,
            EndDate = week.EndDate,
            LabelMonth = week.LabelMonth,
            LabelYear = week.LabelYear,
            Label = WorkWeekCalculator.BuildLabel(week),
            PlanDeadlineAt = week.PlanDeadlineAt,
            ReportDeadlineAt = week.ReportDeadlineAt,
            IsDeadlineCustomized = week.IsDeadlineCustomized,
            EffectivePlanDeadlineAt = effectivePlan,
            EffectiveReportDeadlineAt = effectiveReport,
            Overrides = week.DeadlineOverrides
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.WorkshopId)
                .Select(x => new WorkWeekDeadlineOverrideDto
                {
                    WorkshopId = x.WorkshopId,
                    WorkshopName = tree.Get(x.WorkshopId)?.Name,
                    PlanDeadlineAt = x.PlanDeadlineAt,
                    ReportDeadlineAt = x.ReportDeadlineAt,
                })
                .ToList(),
        };
    }

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);
}