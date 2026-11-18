using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Employees.Services.Interfaces;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Form tuần: tạo / cập nhật thông tin chụp, quyền + trạng thái giai đoạn, mở khóa, khung lưới và Tổng hợp của xưởng
/// (dòng của từng giai đoạn do WorkPlanService / WorkReportService nạp).
/// Thông tin chụp cập nhật theo hiện tại khi báo cáo còn mở, cố định khi đã khóa báo cáo;
/// tiền tố chỉ đổi khi form chưa cấp mã nào (mã trong 1 form luôn cùng tiền tố).
/// </summary>
public class WeeklyFormService(
    IWeeklyFormRepository formRepository,
    IWorkReportUnitRepository unitRepository,
    IWorkWeekRepository weekRepository,
    IWorkReportSettingRepository settingRepository,
    IWorkCategoryRepository categoryRepository,
    IWorkWeekService weekService,
    IWorkReportScopeService scopeService,
    IWorkReportUnitSyncService unitSyncService,
    IWorkReportNotifier notifier,
    IOrgTreeProvider orgTreeProvider,
    IEmployeeService employeeService,
    IUnitOfWork unitOfWork,
    ILogger<WeeklyFormService> logger) : IWeeklyFormService
{
    private const string FormNotFoundMessage = "Không tìm thấy form báo cáo.";
    private const int EngineerNamesMaxLength = 500;
    private const int MaxUnlockDays = 30;

    public async Task SyncFormsAsync(IReadOnlyCollection<int>? unitIds, CancellationToken cancellationToken)
    {
        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);
        var currentMonday = WorkWeekCalculator.GetMonday(today);

        await weekService.EnsureWeeksAsync(currentMonday.AddDays(-7), 3, cancellationToken);
        var weeks = await weekRepository.GetByStartDateRangeAsync(
            currentMonday.AddDays(-7), currentMonday.AddDays(7), cancellationToken);

        var units = (await unitRepository.GetListAsync(includeInactive: true, cancellationToken))
            .Where(x => unitIds is null || unitIds.Contains(x.Id))
            .ToList();
        if (units.Count == 0 || weeks.Count == 0)
        {
            return;
        }

        var unitIdList = units.Select(x => x.Id).ToList();
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var setting = await settingRepository.GetAsync(cancellationToken);
        var engineerNames = await GetEngineerNamesAsync(unitIdList, weeks, cancellationToken);

        var forms = await formRepository.FindByWeeksAsync(
            weeks.Select(x => x.Id).ToList(), unitIdList, cancellationToken);
        var existingIds = forms.Select(x => x.Id).ToList();
        var formIdsWithCodes = (await formRepository.GetFormIdsWithCodesAsync(existingIds, cancellationToken)).ToHashSet();
        var formIdsWithItems = (await formRepository.GetFormIdsWithItemsAsync(existingIds, cancellationToken)).ToHashSet();

        var added = new List<WeeklyForm>();
        foreach (var unit in units)
        {
            var orgUnit = tree.Get(unit.OrgUnitId);
            var workshop = tree.GetWorkshop(unit.OrgUnitId);
            var isUsable = unit.IsActive && orgUnit?.IsActive == true && workshop is not null;

            foreach (var week in weeks)
            {
                // KTV của form = mọi người phụ trách trong tuần đó (đổi người giữa tuần → "B, C")
                var names = engineerNames.GetValueOrDefault((unit.Id, week.Id));
                var form = forms.FirstOrDefault(x => x.WorkReportUnitId == unit.Id && x.WorkWeekId == week.Id);
                if (form is null)
                {
                    if (isUsable && IsReportStillOpen(week, workshop!.Id, now))
                    {
                        form = new WeeklyForm { WorkReportUnitId = unit.Id, WorkWeekId = week.Id };
                        ApplySnapshot(form, unit, workshop.Id, names, setting, updatePrefix: true);
                        formRepository.Add(form);
                        added.Add(form);
                    }

                    continue;
                }

                if (!IsReportStillOpen(week, form.WorkshopId, now))
                {
                    // Tuần đã khóa (quá hạn báo cáo, kể cả khi admin mở khóa lại để sửa số liệu): giữ nguyên form
                    // và thông tin đã chụp; thêm / sửa / ngừng dùng / xóa đơn vị chỉ áp từ tuần còn mở trở đi
                    continue;
                }

                if (!isUsable)
                {
                    // Đơn vị ngừng dùng: bỏ form trống của mọi tuần còn mở (kể cả tuần đang chạy); form đã có dữ liệu giữ nguyên
                    if (!formIdsWithItems.Contains(form.Id))
                    {
                        formRepository.Remove(form);
                    }

                    continue;
                }

                ApplySnapshot(form, unit, workshop!.Id, names, setting, updatePrefix: !formIdsWithCodes.Contains(form.Id));
            }
        }

        try
        {
            await unitOfWork.SaveChangesAsync(cancellationToken);
            if (added.Count > 0)
            {
                logger.LogInformation("Đã tạo {Count} form báo cáo tuần", added.Count);
            }
        }
        catch (DbUpdateException ex) when (added.Count > 0)
        {
            // Request khác vừa tạo cùng form (trùng đơn vị + tuần): bỏ form vừa thêm, lưu lại phần cập nhật
            logger.LogWarning(ex, "Form báo cáo tuần đã được tiến trình khác tạo, bỏ qua");
            formRepository.Detach(added);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<WeeklyFormContext> GetContextAsync(
        int formId, string phase, WorkItemAction action, CancellationToken cancellationToken)
    {
        var form = await formRepository.GetByIdAsync(formId, cancellationToken)
            ?? throw new NotFoundException(FormNotFoundMessage);

        var access = await scopeService.GetUnitAccessAsync(
            form.WorkReportUnit, form.WorkshopId, form.WorkWeek, cancellationToken);
        if (!access.CanView)
        {
            throw new ForbiddenException("Bạn không có quyền xem form của đơn vị này.");
        }

        var context = BuildContext(form, form.WorkWeek, access, phase, DateTime.Now, 0);
        if (action != WorkItemAction.View)
        {
            EnsureCan(context, action);
        }

        return context;
    }

    public async Task<IReadOnlyList<WeeklyFormContext>> GetVisibleFormsAsync(
        int workshopId, int weekId, string phase, int? unitId, CancellationToken cancellationToken)
    {
        var week = await weekRepository.GetByIdAsync(weekId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy kỳ tuần.");

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        if (tree.Get(workshopId) is null || tree.GetWorkshop(workshopId)?.Id != workshopId)
        {
            throw new NotFoundException("Không tìm thấy xưởng.");
        }

        // Tuần đang làm việc: tạo đơn vị cho tổ/kíp mới trên sơ đồ, tạo form còn thiếu cho đơn vị hiện thuộc xưởng
        var currentMonday = WorkWeekCalculator.GetMonday(DateOnly.FromDateTime(DateTime.Now));
        if (week.StartDate >= currentMonday.AddDays(-7) && week.StartDate <= currentMonday.AddDays(7))
        {
            await unitSyncService.EnsureFromOrgChartAsync(workshopId, cancellationToken);
            var unitIdsInWorkshop = (await unitRepository.GetListAsync(includeInactive: false, cancellationToken))
                .Where(x => tree.GetWorkshop(x.OrgUnitId)?.Id == workshopId)
                .Select(x => x.Id)
                .ToList();
            if (unitIdsInWorkshop.Count > 0)
            {
                await SyncFormsAsync(unitIdsInWorkshop, cancellationToken);
            }
        }

        var forms = (await formRepository.GetByWeekAndWorkshopAsync(weekId, workshopId, cancellationToken))
            .OrderBy(x => x.WorkReportUnit.SortOrder).ThenBy(x => x.WorkReportUnitId)
            .ToList();

        var now = DateTime.Now;
        var visible = new List<WeeklyFormContext>();
        for (var i = 0; i < forms.Count; i++)
        {
            var access = await scopeService.GetUnitAccessAsync(forms[i].WorkReportUnit, workshopId, week, cancellationToken);
            if (access.CanView)
            {
                visible.Add(BuildContext(forms[i], week, access, phase, now, i + 1));
            }
        }

        var scope = await scopeService.GetScopeAsync(cancellationToken);
        if (scope.PublicWorkshopIds is { } publicIds && !publicIds.Contains(workshopId))
        {
            throw new ForbiddenException("Xưởng này chưa được hiện trên trang công khai.");
        }

        var canSeeWorkshop = scope.CanConfigure || scope.CanViewFactory
                             || scope.ManagedWorkshopIds.Contains(workshopId) || visible.Count > 0;
        if (!canSeeWorkshop)
        {
            throw new ForbiddenException("Bạn không có quyền xem báo cáo công việc của xưởng này.");
        }

        return unitId is { } id ? visible.Where(x => x.Form.WorkReportUnitId == id).ToList() : visible;
    }

    public async Task<WorkGridDto<TForm>> BuildGridAsync<TForm>(
        WorkReportGridRequest request,
        string phase,
        Func<IReadOnlyList<WeeklyFormContext>, Task<(IReadOnlyList<TForm> Forms, IReadOnlySet<int> UsedCategoryIds)>> buildForms,
        CancellationToken cancellationToken)
        where TForm : WeeklyFormDto
    {
        var contexts = await GetVisibleFormsAsync(request.WorkshopId, request.WeekId, phase, request.UnitId, cancellationToken);
        var (forms, usedCategoryIds) = await buildForms(contexts);

        // Lựa chọn cột (10) KTV phụ trách: kỹ sư đang được phân công từng tổ/kíp
        var engineerOptions = await GetEngineerOptionsAsync(
            forms.Select(x => x.UnitId).Distinct().ToList(), cancellationToken);
        foreach (var form in forms)
        {
            form.Engineers = engineerOptions.GetValueOrDefault(form.UnitId, []);
        }

        var categories = await categoryRepository.GetListAsync(includeInactive: true, cancellationToken);
        var week = await weekService.GetByIdAsync(request.WeekId, request.WorkshopId, cancellationToken);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var workshopName = tree.GetName(request.WorkshopId);

        return new WorkGridDto<TForm>
        {
            WorkshopId = request.WorkshopId,
            WorkshopName = workshopName,
            Phase = phase,
            Title = WeeklyFormRules.BuildTitle(phase, workshopName, ToWeek(week)),
            Week = week,
            Categories = categories
                .Where(x => usedCategoryIds.Contains(x.Id) || IsCategoryUsable(x, request.WorkshopId))
                .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                .Select(WorkCategoryService.ToDto)
                .ToList(),
            Forms = forms,
        };
    }

    public async Task<WorkReportSummaryDto> BuildSummaryAsync(
        WorkReportGridRequest request,
        string phase,
        Func<IReadOnlyList<int>, Task<IReadOnlyList<SummaryEntry>>> loadEntries,
        Func<IReadOnlyList<int>, Task<IReadOnlyList<SummaryMaterial>>> loadMaterials,
        CancellationToken cancellationToken)
    {
        var contexts = await GetVisibleFormsAsync(request.WorkshopId, request.WeekId, phase, request.UnitId, cancellationToken);
        var formIds = contexts.Select(x => x.Form.Id).ToList();

        var entries = await loadEntries(formIds);
        var materials = await loadMaterials(formIds);
        var categories = await categoryRepository.GetListAsync(includeInactive: true, cancellationToken);

        var usedCategoryIds = entries.Select(x => x.CategoryId).ToHashSet();
        var columns = categories
            .Where(x => x.ShowInSummary && (usedCategoryIds.Contains(x.Id) || IsCategoryUsable(x, request.WorkshopId)))
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .ToList();

        var entriesByForm = entries.ToLookup(x => x.FormId);
        var materialsByForm = materials.ToLookup(x => x.FormId);

        var rows = contexts.Select(context =>
        {
            var formEntries = entriesByForm[context.Form.Id].ToList();
            var total = formEntries.Sum(x => x.Minutes);
            return new WorkReportSummaryRowDto
            {
                FormId = context.Form.Id,
                UnitId = context.Form.WorkReportUnitId,
                OrderLabel = WeeklyFormRules.ToRoman(context.OrderNo),
                UnitName = context.Form.UnitName,
                LaborType = context.Form.LaborType,
                EngineerNames = context.Form.EngineerNames,
                MaterialCodeCount = CountMaterialCodes(materialsByForm[context.Form.Id]),
                MinutesByCategory = columns.ToDictionary(
                    c => c.Id,
                    c => formEntries.Where(x => x.CategoryId == c.Id).Sum(x => x.Minutes)),
                TotalMinutes = total,
                CapacityMinutes = context.Form.CapacityMinutes,
                Manpower = context.Form.CapacityMinutes > 0 ? Math.Round(total / context.Form.CapacityMinutes, 2) : 0,
                ItemCount = formEntries.Count,
                Status = context.State.Status,
            };
        }).ToList();

        var week = await weekService.GetByIdAsync(request.WeekId, request.WorkshopId, cancellationToken);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var workshopName = tree.GetName(request.WorkshopId);

        return new WorkReportSummaryDto
        {
            WorkshopId = request.WorkshopId,
            WorkshopName = workshopName,
            Phase = phase,
            Title = WeeklyFormRules.BuildTitle(phase, workshopName, ToWeek(week)),
            Week = week,
            Columns = columns.Select(WorkCategoryService.ToDto).ToList(),
            Rows = rows,
            Total = new WorkReportSummaryRowDto
            {
                UnitName = "Tổng cộng",
                MaterialCodeCount = CountMaterialCodes(materials),
                MinutesByCategory = columns.ToDictionary(c => c.Id, c => rows.Sum(r => r.MinutesByCategory[c.Id])),
                TotalMinutes = rows.Sum(x => x.TotalMinutes),
                CapacityMinutes = rows.Sum(x => x.CapacityMinutes),
                Manpower = rows.Sum(x => x.Manpower),
                ItemCount = rows.Sum(x => x.ItemCount),
            },
        };
    }

    public async Task UnlockAsync(int formId, string phase, UnlockFormRequest request, CancellationToken cancellationToken)
    {
        var context = await GetContextAsync(formId, phase, WorkItemAction.View, cancellationToken);
        if (!context.Access.CanUnlock)
        {
            throw new ForbiddenException(
                "Bạn không có quyền mở khóa tổ/kíp này (cần quyền work-reports.unlock và là trưởng/phó đội/xưởng chứa tổ/kíp).");
        }

        var now = DateTime.Now;
        if (request.Until is { } until)
        {
            if (until <= now)
            {
                throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
                {
                    ["until"] = ["Thời điểm mở khóa tới phải sau hiện tại."],
                });
            }

            if (until > now.AddDays(MaxUnlockDays))
            {
                throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
                {
                    ["until"] = [$"Chỉ mở khóa tối đa {MaxUnlockDays} ngày."],
                });
            }
        }

        var form = await formRepository.FindByIdAsync(formId, cancellationToken)
            ?? throw new NotFoundException(FormNotFoundMessage);
        if (context.IsPlan)
        {
            form.PlanUnlockedUntil = request.Until;
        }
        else
        {
            form.ReportUnlockedUntil = request.Until;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        await notifier.FormChangedAsync(context.Form, context.Phase);
        logger.LogInformation(
            "Form {FormId} ({Phase}) mở khóa tới {Until}", formId, context.Phase, request.Until?.ToString("O") ?? "(khóa lại)");
    }

    // ===== Hỗ trợ =====

    public static string NormalizePhase(string? phase)
    {
        var value = phase?.Trim().ToUpperInvariant() ?? string.Empty;
        if (!WorkReportPhases.All.Contains(value))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["phase"] = ["Giai đoạn phải là PLAN (kế hoạch) hoặc REPORT (báo cáo)."],
            });
        }

        return value;
    }

    /// <summary>Phần đầu form (trạng thái, quyền, tổng) cho DTO lưới của từng giai đoạn.</summary>
    public static TForm ToFormDto<TForm>(
        WeeklyFormContext context, int itemCount, decimal totalPlanned, decimal totalActual)
        where TForm : WeeklyFormDto, new() => new()
    {
        FormId = context.Form.Id,
        UnitId = context.Form.WorkReportUnitId,
        WorkWeekId = context.Form.WorkWeekId,
        WorkshopId = context.Form.WorkshopId,
        OrderNo = context.OrderNo,
        OrderLabel = WeeklyFormRules.ToRoman(context.OrderNo),
        UnitName = context.Form.UnitName,
        CodePrefix = context.Form.CodePrefix,
        LaborType = context.Form.LaborType,
        CapacityMinutes = context.Form.CapacityMinutes,
        EngineerNames = context.Form.EngineerNames,
        Status = context.State.Status,
        DeadlineAt = context.State.DeadlineAt,
        PlanStatus = context.PlanState.Status,
        PlanDeadlineAt = context.PlanState.DeadlineAt,
        ReportStatus = context.ReportState.Status,
        ReportDeadlineAt = context.ReportState.DeadlineAt,
        Role = context.Access.Role,
        CanCreate = context.CanCreateNow,
        CanUpdate = context.CanUpdateNow,
        CanDelete = context.CanDeleteNow,
        CanUnlock = context.Access.CanUnlock,
        IsUnlocked = context.State.IsUnlocked,
        ItemCount = itemCount,
        TotalPlannedMinutes = totalPlanned,
        TotalActualMinutes = totalActual,
    };

    private static void EnsureCan(WeeklyFormContext context, WorkItemAction action)
    {
        var phaseName = context.IsPlan ? "kế hoạch" : "báo cáo";
        var allowed = action switch
        {
            WorkItemAction.Create => context.Rights.CanCreate,
            WorkItemAction.Update => context.Rights.CanUpdate,
            WorkItemAction.Delete => context.Rights.CanDelete,
            _ => true,
        };
        if (!allowed)
        {
            var verb = action switch
            {
                WorkItemAction.Create => "thêm",
                WorkItemAction.Update => "sửa",
                _ => "xóa",
            };
            throw new ForbiddenException($"Bạn không có quyền {verb} {phaseName} của {context.Form.UnitName}.");
        }

        if (context.State.IsOpen)
        {
            return;
        }

        throw new BusinessException(context.State.Status == FormPhaseStatuses.NotStarted
            ? $"Chưa tới tuần {context.Week.IsoWeek:D2}, chưa nhập báo cáo được (mở từ {context.Week.StartDate:dd/MM/yyyy})."
            : $"{(context.IsPlan ? "Kế hoạch" : "Báo cáo")} tuần {context.Week.IsoWeek:D2} của {context.Form.UnitName} đã khóa lúc "
              + $"{context.State.DeadlineAt:HH:mm dd/MM/yyyy}. Liên hệ quản trị để mở khóa.");
    }

    private static WeeklyFormContext BuildContext(
        WeeklyForm form, WorkWeek week, WorkReportUnitAccessDto access, string phase, DateTime now, int orderNo) => new()
    {
        Form = form,
        Week = week,
        Access = access,
        Phase = NormalizePhase(phase),
        PlanState = WeeklyFormRules.GetPlanState(form, week, now),
        ReportState = WeeklyFormRules.GetReportState(form, week, now),
        OrderNo = orderNo,
    };

    /// <summary>Đầu mục đang dùng và áp dụng cho xưởng (không có danh sách xưởng = mọi xưởng).</summary>
    public static bool IsCategoryUsable(WorkCategory category, int workshopId) =>
        category.IsActive && (category.Workshops.Count == 0 || category.Workshops.Any(x => x.WorkshopId == workshopId));

    /// <summary>Số đầu mã vật tư: đếm mã khác nhau (vật tư chưa có mã thì đếm theo tên).</summary>
    public static int CountMaterialCodes(IEnumerable<SummaryMaterial> materials) =>
        materials
            .Select(x => TextNormalizer.ToKey(string.IsNullOrWhiteSpace(x.MaterialCode) ? x.MaterialName : x.MaterialCode))
            .Where(x => x.Length > 0)
            .Distinct()
            .Count();

    /// <summary>Báo cáo của tuần chưa khóa (theo hạn hiệu lực của xưởng) → còn tạo form được.</summary>
    private static bool IsReportStillOpen(WorkWeek week, int workshopId, DateTime now) =>
        now <= WorkWeekService.GetEffectiveDeadlines(week, workshopId).Report;

    private static void ApplySnapshot(
        WeeklyForm form, WorkReportUnit unit, int workshopId, string? engineerNames,
        WorkReportSetting setting, bool updatePrefix)
    {
        form.WorkshopId = workshopId;
        form.UnitName = unit.DisplayName;
        form.LaborType = unit.LaborType;
        form.CapacityMinutes = unit.LaborType == LaborTypes.Shift ? setting.ShiftMinutesPerWeek : setting.HcMinutesPerWeek;
        form.EngineerNames = engineerNames;
        if (updatePrefix)
        {
            form.CodePrefix = unit.CodePrefix;
        }
    }

    private async Task<IReadOnlyDictionary<int, IReadOnlyList<EngineerOptionDto>>> GetEngineerOptionsAsync(
        IReadOnlyCollection<int> unitIds, CancellationToken cancellationToken)
    {
        if (unitIds.Count == 0)
        {
            return new Dictionary<int, IReadOnlyList<EngineerOptionDto>>();
        }

        var engineers = await unitRepository.GetActiveEngineersAsync(
            unitIds, DateOnly.FromDateTime(DateTime.Now), cancellationToken);
        var employees = (await employeeService.GetBriefsAsync(
                engineers.Select(x => x.EmployeeId).Distinct().ToList(), cancellationToken))
            .ToDictionary(x => x.Id, x => x.FullName);

        return engineers
            .GroupBy(x => x.WorkReportUnitId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<EngineerOptionDto>)g
                    .Select(x => new EngineerOptionDto
                    {
                        EmployeeId = x.EmployeeId,
                        FullName = employees.GetValueOrDefault(x.EmployeeId) ?? $"#{x.EmployeeId}",
                    })
                    .ToList());
    }

    /// <summary>
    /// Tên KTV theo (đơn vị, tuần): mọi kỹ sư có phân công hiệu lực ít nhất 1 ngày trong tuần, theo thứ tự bắt đầu phụ trách.
    /// </summary>
    private async Task<IReadOnlyDictionary<(int UnitId, int WeekId), string>> GetEngineerNamesAsync(
        IReadOnlyCollection<int> unitIds, IReadOnlyList<WorkWeek> weeks, CancellationToken cancellationToken)
    {
        var result = new Dictionary<(int UnitId, int WeekId), string>();
        if (weeks.Count == 0)
        {
            return result;
        }

        var engineers = await unitRepository.GetEngineersInRangeAsync(
            unitIds, weeks.Min(x => x.StartDate), weeks.Max(x => x.EndDate), cancellationToken);
        if (engineers.Count == 0)
        {
            return result;
        }

        var employees = (await employeeService.GetBriefsAsync(
                engineers.Select(x => x.EmployeeId).Distinct().ToList(), cancellationToken))
            .ToDictionary(x => x.Id, x => x.FullName);

        foreach (var group in engineers.GroupBy(x => x.WorkReportUnitId))
        {
            foreach (var week in weeks)
            {
                var employeeIds = group
                    .Where(x => x.StartDate <= week.EndDate && (x.EndDate is null || x.EndDate >= week.StartDate))
                    .Select(x => x.EmployeeId)
                    .Distinct()
                    .ToList();
                if (employeeIds.Count == 0)
                {
                    continue;
                }

                var names = string.Join(", ", employeeIds.Select(id => employees.GetValueOrDefault(id) ?? $"#{id}"));
                result[(group.Key, week.Id)] = names.Length > EngineerNamesMaxLength ? names[..EngineerNamesMaxLength] : names;
            }
        }

        return result;
    }

    /// <summary>Dựng WorkWeek tạm từ DTO để tạo tiêu đề.</summary>
    private static WorkWeek ToWeek(WorkWeekDto dto) => new()
    {
        IsoYear = dto.IsoYear,
        IsoWeek = dto.IsoWeek,
        StartDate = dto.StartDate,
        EndDate = dto.EndDate,
        LabelMonth = dto.LabelMonth,
        LabelYear = dto.LabelYear,
    };
}