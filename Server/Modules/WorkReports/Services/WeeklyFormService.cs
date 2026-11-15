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
/// Form tuần: tạo / cập nhật thông tin chụp, quyền + trạng thái giai đoạn, lưới công việc và Tổng hợp của xưởng.
/// Thông tin chụp cập nhật theo hiện tại khi báo cáo còn mở, cố định khi đã khóa báo cáo;
/// tiền tố chỉ đổi khi form chưa cấp mã nào (mã trong 1 form luôn cùng tiền tố).
/// </summary>
public class WeeklyFormService(
    IWeeklyFormRepository formRepository,
    IWorkItemRepository itemRepository,
    IWorkMaterialRepository materialRepository,
    IWorkReportUnitRepository unitRepository,
    IWorkWeekRepository weekRepository,
    IWorkReportSettingRepository settingRepository,
    IWorkCategoryRepository categoryRepository,
    IWorkWeekService weekService,
    IWorkReportScopeService scopeService,
    IWorkReportUnitSyncService unitSyncService,
    IOrgTreeProvider orgTreeProvider,
    IEmployeeService employeeService,
    IUnitOfWork unitOfWork,
    ILogger<WeeklyFormService> logger) : IWeeklyFormService
{
    private const string FormNotFoundMessage = "Không tìm thấy form báo cáo.";
    private const int EngineerNamesMaxLength = 500;

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
        var engineerNames = await GetEngineerNamesAsync(unitIdList, today, cancellationToken);

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
            var names = engineerNames.GetValueOrDefault(unit.Id);

            foreach (var week in weeks)
            {
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

                if (WeeklyFormRules.GetReportState(form, week, now).Status == FormPhaseStatuses.Locked)
                {
                    // Đã khóa báo cáo: giữ nguyên thông tin đã chụp
                    continue;
                }

                if (!isUsable)
                {
                    // Đơn vị ngừng dùng: bỏ form trống của tuần chưa bắt đầu; form đã có dữ liệu giữ nguyên
                    if (week.StartDate > today && !formIdsWithItems.Contains(form.Id))
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
        int formId, string phase, bool forEdit, CancellationToken cancellationToken)
    {
        phase = NormalizePhase(phase);
        var form = await formRepository.GetByIdAsync(formId, cancellationToken)
            ?? throw new NotFoundException(FormNotFoundMessage);

        var access = await scopeService.GetUnitAccessAsync(form.WorkReportUnit, form.WorkshopId, cancellationToken);
        if (!access.CanView)
        {
            throw new ForbiddenException("Bạn không có quyền xem form của đơn vị này.");
        }

        var context = BuildContext(form, form.WorkWeek, access, phase, DateTime.Now, 0);
        if (forEdit)
        {
            EnsureCanEdit(context);
        }

        return context;
    }

    public async Task<IReadOnlyList<WeeklyFormContext>> GetVisibleFormsAsync(
        int workshopId, int weekId, string phase, int? unitId, CancellationToken cancellationToken)
    {
        phase = NormalizePhase(phase);
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
            var access = await scopeService.GetUnitAccessAsync(forms[i].WorkReportUnit, workshopId, cancellationToken);
            if (access.CanView)
            {
                visible.Add(BuildContext(forms[i], week, access, phase, now, i + 1));
            }
        }

        var scope = await scopeService.GetScopeAsync(cancellationToken);
        var canSeeWorkshop = scope.CanConfigure || scope.CanViewFactory
                             || scope.ManagedWorkshopIds.Contains(workshopId) || visible.Count > 0;
        if (!canSeeWorkshop)
        {
            throw new ForbiddenException("Bạn không có quyền xem báo cáo công việc của xưởng này.");
        }

        return unitId is { } id ? visible.Where(x => x.Form.WorkReportUnitId == id).ToList() : visible;
    }

    public async Task<WorkReportGridDto> GetGridAsync(WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        var phase = NormalizePhase(request.Phase);
        var contexts = await GetVisibleFormsAsync(request.WorkshopId, request.WeekId, phase, request.UnitId, cancellationToken);
        var formIds = contexts.Select(x => x.Form.Id).ToList();

        var items = await itemRepository.GetByFormIdsAsync(
            formIds, includeUnplanned: phase == WorkReportPhases.Report, cancellationToken);
        var categories = (await categoryRepository.GetListAsync(includeInactive: true, cancellationToken))
            .ToDictionary(x => x.Id);
        var employees = (await employeeService.GetBriefsAsync(WorkItemMapper.CollectEmployeeIds(items), cancellationToken))
            .ToDictionary(x => x.Id);

        var itemsByForm = items.ToLookup(x => x.WeeklyFormId);
        var forms = contexts.Select(context =>
        {
            var tt = new Dictionary<int, int>();
            var formItems = itemsByForm[context.Form.Id]
                .OrderBy(x => categories.GetValueOrDefault(x.WorkCategoryId)?.SortOrder ?? int.MaxValue)
                .ThenBy(x => x.WorkCategoryId)
                .ThenBy(x => x.SortOrder).ThenBy(x => x.Id)
                .Select(x =>
                {
                    // TT đánh lại trong từng nhóm đầu mục
                    tt[x.WorkCategoryId] = tt.GetValueOrDefault(x.WorkCategoryId) + 1;
                    return WorkItemMapper.ToDto(x, categories, employees, tt[x.WorkCategoryId]);
                })
                .ToList();

            return ToFormDto(context, formItems);
        }).ToList();

        var week = await weekService.GetByIdAsync(request.WeekId, request.WorkshopId, cancellationToken);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var workshopName = tree.GetName(request.WorkshopId);
        var usedCategoryIds = items.Select(x => x.WorkCategoryId).ToHashSet();

        return new WorkReportGridDto
        {
            WorkshopId = request.WorkshopId,
            WorkshopName = workshopName,
            Phase = phase,
            Title = WeeklyFormRules.BuildTitle(phase, workshopName, ToWeek(week)),
            Week = week,
            Categories = categories.Values
                .Where(x => usedCategoryIds.Contains(x.Id) || IsCategoryUsable(x, request.WorkshopId))
                .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                .Select(WorkCategoryService.ToDto)
                .ToList(),
            Forms = forms,
        };
    }

    public async Task<WorkReportSummaryDto> GetSummaryAsync(
        WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        var phase = NormalizePhase(request.Phase);
        var isPlan = phase == WorkReportPhases.Plan;
        var contexts = await GetVisibleFormsAsync(request.WorkshopId, request.WeekId, phase, request.UnitId, cancellationToken);
        var formIds = contexts.Select(x => x.Form.Id).ToList();

        var items = await itemRepository.GetByFormIdsAsync(formIds, includeUnplanned: !isPlan, cancellationToken);
        var materials = await materialRepository.GetByFormIdsAsync(formIds, includeUnplanned: !isPlan, cancellationToken);
        var categories = await categoryRepository.GetListAsync(includeInactive: true, cancellationToken);

        var usedCategoryIds = items.Select(x => x.WorkCategoryId).ToHashSet();
        var columns = categories
            .Where(x => x.ShowInSummary && (usedCategoryIds.Contains(x.Id) || IsCategoryUsable(x, request.WorkshopId)))
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .ToList();

        decimal MinutesOf(WorkItem item) => isPlan
            ? item.PlannedMinutes ?? 0
            : item.ActualMinutes ?? item.PlannedMinutes ?? 0;

        var itemsByForm = items.ToLookup(x => x.WeeklyFormId);
        var materialsByForm = materials.ToLookup(x => x.WeeklyFormId);

        var rows = contexts.Select(context =>
        {
            var formItems = itemsByForm[context.Form.Id].ToList();
            var total = formItems.Sum(MinutesOf);
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
                    c => formItems.Where(x => x.WorkCategoryId == c.Id).Sum(MinutesOf)),
                TotalMinutes = total,
                CapacityMinutes = context.Form.CapacityMinutes,
                Manpower = context.Form.CapacityMinutes > 0 ? Math.Round(total / context.Form.CapacityMinutes, 2) : 0,
                ItemCount = formItems.Count,
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

    private static void EnsureCanEdit(WeeklyFormContext context)
    {
        if (!context.Access.CanEdit)
        {
            throw new ForbiddenException("Bạn không có quyền nhập/sửa form của đơn vị này.");
        }

        if (context.CanEditNow)
        {
            return;
        }

        var phaseName = context.IsPlan ? "Kế hoạch" : "Báo cáo";
        throw new BusinessException(context.State.Status == FormPhaseStatuses.NotStarted
            ? $"Chưa tới tuần {context.Week.IsoWeek:D2}, chưa nhập báo cáo được (mở từ {context.Week.StartDate:dd/MM/yyyy})."
            : $"{phaseName} tuần {context.Week.IsoWeek:D2} của {context.Form.UnitName} đã khóa lúc "
              + $"{context.State.DeadlineAt:HH:mm dd/MM/yyyy}. Liên hệ quản đốc / phó quản đốc để điều chỉnh.");
    }

    private static WeeklyFormContext BuildContext(
        WeeklyForm form, WorkWeek week, WorkReportUnitAccessDto access, string phase, DateTime now, int orderNo) => new()
    {
        Form = form,
        Week = week,
        Access = access,
        Phase = phase,
        PlanState = WeeklyFormRules.GetPlanState(form, week, now),
        ReportState = WeeklyFormRules.GetReportState(form, week, now),
        OrderNo = orderNo,
    };

    private static WeeklyFormDto ToFormDto(WeeklyFormContext context, IReadOnlyList<WorkItemDto> items) => new()
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
        CanEditNow = context.CanEditNow,
        CanEditLocked = context.Access.CanEditLocked,
        CanRequestRevision = context.Access.CanRequestRevision,
        CanUnlock = context.Access.CanUnlock,
        ItemCount = items.Count,
        TotalPlannedMinutes = items.Sum(x => x.PlannedMinutes ?? 0),
        TotalActualMinutes = items.Sum(x => x.EffectiveActualMinutes),
        Items = items,
    };

    /// <summary>Đầu mục đang dùng và áp dụng cho xưởng (không có danh sách xưởng = mọi xưởng).</summary>
    public static bool IsCategoryUsable(WorkCategory category, int workshopId) =>
        category.IsActive && (category.Workshops.Count == 0 || category.Workshops.Any(x => x.WorkshopId == workshopId));

    /// <summary>Số đầu mã vật tư: đếm mã khác nhau (vật tư chưa có mã thì đếm theo tên).</summary>
    private static int CountMaterialCodes(IEnumerable<WorkMaterial> materials) =>
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

    private async Task<IReadOnlyDictionary<int, string>> GetEngineerNamesAsync(
        IReadOnlyCollection<int> unitIds, DateOnly today, CancellationToken cancellationToken)
    {
        var engineers = await unitRepository.GetActiveEngineersAsync(unitIds, today, cancellationToken);
        if (engineers.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        var employees = (await employeeService.GetBriefsAsync(
                engineers.Select(x => x.EmployeeId).Distinct().ToList(), cancellationToken))
            .ToDictionary(x => x.Id, x => x.FullName);

        return engineers
            .GroupBy(x => x.WorkReportUnitId)
            .ToDictionary(g => g.Key, g =>
            {
                var names = string.Join(", ", g.Select(x => employees.GetValueOrDefault(x.EmployeeId) ?? $"#{x.EmployeeId}"));
                return names.Length > EngineerNamesMaxLength ? names[..EngineerNamesMaxLength] : names;
            });
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
