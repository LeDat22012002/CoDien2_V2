using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Employees.DTOs;
using Server.Modules.Employees.Services.Interfaces;
using Server.Modules.Equipments.DTOs;
using Server.Modules.Equipments.Services.Interfaces;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

public class WorkItemService(
    IWorkItemRepository itemRepository,
    IWorkMaterialRepository materialRepository,
    IWorkCategoryRepository categoryRepository,
    IWorkReportUnitRepository unitRepository,
    IWeeklyFormService formService,
    IWorkReportScopeService scopeService,
    IOrgTreeProvider orgTreeProvider,
    IEmployeeService employeeService,
    IEquipmentService equipmentService,
    IAssignmentService assignmentService,
    IUnitOfWork unitOfWork) : IWorkItemService
{
    private const string NotFoundMessage = "Không tìm thấy dòng công việc (có thể đã bị xóa).";
    private const string ConflictMessage =
        "Dòng công việc vừa được người khác sửa. Dữ liệu mới nhất đã được tải lại, vui lòng kiểm tra rồi nhập lại.";
    private const int SortOrderStep = 10;
    private const int MaxBatchRows = 1000;
    private const int MaxWorkerOptions = 500;

    public async Task<WorkItemDto> CreateAsync(
        int formId, string phase, CreateWorkItemRequest request, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, phase, forEdit: true, cancellationToken);
        Normalize(request);
        WorkItemRequestValidator.Validate(request, context.Week, context.IsPlan, isUnplanned: !context.IsPlan,
            categoryEditable: true);

        var category = await GetUsableCategoryAsync(request.WorkCategoryId, context.Form.WorkshopId, cancellationToken);
        var workers = await BuildWorkersAsync(request.Workers, cancellationToken);
        var equipment = await ResolveEquipmentAsync(request.EquipmentCode, cancellationToken);

        var item = new WorkItem
        {
            WeeklyFormId = formId,
            WorkCategoryId = category.Id,
            IsUnplanned = !context.IsPlan,
            SortOrder = request.SortOrder
                        ?? await itemRepository.GetMaxSortOrderAsync(formId, cancellationToken) + SortOrderStep,
        };
        ApplyFields(item, request, context.IsPlan, equipment, workers);

        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var seq = await itemRepository.NextCodeSeqAsync(formId, category.Id, ct);
            item.CodeSeq = seq;
            item.Code = WeeklyFormRules.BuildCode(context.Form.CodePrefix, category.CodeSuffix, seq);
            itemRepository.Add(item);
        }, cancellationToken);

        return await ToDtoAsync(item, cancellationToken);
    }

    public async Task<WorkItemDto> UpdateAsync(
        int id, string phase, UpdateWorkItemRequest request, CancellationToken cancellationToken)
    {
        var item = await itemRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var context = await formService.GetContextAsync(item.WeeklyFormId, phase, forEdit: true, cancellationToken);

        if (context.IsPlan && item.IsUnplanned)
        {
            throw new BusinessException("Dòng phát sinh chỉ sửa ở giai đoạn báo cáo.");
        }

        var clientRowVersion = ParseRowVersion(request.RowVersion);
        if (!clientRowVersion.SequenceEqual(item.RowVersion))
        {
            throw new ConflictException(ConflictMessage, await ToDtoAsync(item, cancellationToken));
        }

        // Đầu mục chỉ đổi ở kế hoạch, hoặc với dòng phát sinh
        var categoryEditable = context.IsPlan || item.IsUnplanned;
        Normalize(request);
        WorkItemRequestValidator.Validate(request, context.Week, context.IsPlan, item.IsUnplanned, categoryEditable);

        WorkCategory? newCategory = null;
        if (categoryEditable && request.WorkCategoryId != item.WorkCategoryId)
        {
            newCategory = await GetUsableCategoryAsync(request.WorkCategoryId, context.Form.WorkshopId, cancellationToken);
        }

        var workers = await BuildWorkersAsync(request.Workers, cancellationToken);
        var equipment = await ResolveEquipmentAsync(request.EquipmentCode, cancellationToken);

        ApplyFields(item, request, context.IsPlan, equipment, workers);
        item.SortOrder = request.SortOrder ?? item.SortOrder;
        itemRepository.PrepareConcurrentUpdate(item, clientRowVersion);

        try
        {
            if (newCategory is null)
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            else
            {
                // Đổi đầu mục → cấp mã mới theo đầu mục mới (số cũ không dùng lại)
                await unitOfWork.ExecuteInTransactionAsync(async ct =>
                {
                    var seq = await itemRepository.NextCodeSeqAsync(item.WeeklyFormId, newCategory.Id, ct);
                    item.WorkCategoryId = newCategory.Id;
                    item.CodeSeq = seq;
                    item.Code = WeeklyFormRules.BuildCode(context.Form.CodePrefix, newCategory.CodeSuffix, seq);
                }, cancellationToken);
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            var latest = await itemRepository.GetByIdAsync(id, cancellationToken)
                ?? throw new NotFoundException(NotFoundMessage);
            throw new ConflictException(ConflictMessage, await ToDtoAsync(latest, cancellationToken));
        }

        return await ToDtoAsync(item, cancellationToken);
    }

    public async Task DeleteAsync(int id, string phase, CancellationToken cancellationToken)
    {
        var item = await itemRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var context = await formService.GetContextAsync(item.WeeklyFormId, phase, forEdit: true, cancellationToken);

        if (context.IsPlan && item.IsUnplanned)
        {
            throw new BusinessException("Dòng phát sinh chỉ xóa ở giai đoạn báo cáo.");
        }

        if (!context.IsPlan && !item.IsUnplanned)
        {
            throw new BusinessException(
                "Không xóa dòng kế hoạch ở giai đoạn báo cáo. Việc không thực hiện thì nhập kết quả 0% và ghi diễn giải.");
        }

        foreach (var material in await materialRepository.FindByWorkItemIdAsync(id, cancellationToken))
        {
            materialRepository.Remove(material);
        }

        itemRepository.Remove(item);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<BatchCreateWorkItemsResultDto> BatchCreateAsync(
        int formId, string phase, BatchCreateWorkItemsRequest request, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, phase, forEdit: true, cancellationToken);
        var rows = request.Rows ?? [];
        if (rows.Count == 0)
        {
            return new BatchCreateWorkItemsResultDto();
        }

        if (rows.Count > MaxBatchRows)
        {
            throw new BusinessException($"Mỗi lần dán tối đa {MaxBatchRows} dòng.");
        }

        var categories = (await categoryRepository.GetListAsync(includeInactive: false, cancellationToken))
            .Where(x => WeeklyFormService.IsCategoryUsable(x, context.Form.WorkshopId))
            .ToList();
        var categoryByKey = BuildCategoryLookup(categories);
        var workerMatcher = await BuildWorkerMatcherAsync(context.Form, cancellationToken);
        var equipments = (await equipmentService.GetByCodesAsync(
                rows.Select(x => x.EquipmentCode ?? string.Empty).ToList(), cancellationToken))
            .GroupBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var errors = new List<PastedRowErrorDto>();
        var valid = new List<(WorkItem Item, WorkCategory Category)>();
        var sortOrder = await itemRepository.GetMaxSortOrderAsync(formId, cancellationToken);

        foreach (var row in rows)
        {
            var (itemRequest, category, rowErrors) = ParseRow(row, context, categoryByKey, workerMatcher);
            if (rowErrors.Count > 0)
            {
                errors.Add(new PastedRowErrorDto { RowIndex = row.RowIndex, Errors = rowErrors });
                continue;
            }

            var equipment = itemRequest.EquipmentCode is { } code ? equipments.GetValueOrDefault(code) : null;
            var item = new WorkItem
            {
                WeeklyFormId = formId,
                WorkCategoryId = category!.Id,
                IsUnplanned = !context.IsPlan,
                SortOrder = sortOrder += SortOrderStep,
            };
            ApplyFields(item, itemRequest, context.IsPlan, equipment,
                itemRequest.Workers.Select(x => (x.EmployeeId, x.DisplayName!)).ToList());
            valid.Add((item, category));
        }

        if (valid.Count > 0)
        {
            await unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                foreach (var (item, category) in valid)
                {
                    var seq = await itemRepository.NextCodeSeqAsync(formId, category.Id, ct);
                    item.CodeSeq = seq;
                    item.Code = WeeklyFormRules.BuildCode(context.Form.CodePrefix, category.CodeSuffix, seq);
                    itemRepository.Add(item);
                }
            }, cancellationToken);
        }

        var created = await ToDtosAsync(valid.Select(x => x.Item).ToList(), cancellationToken);
        return new BatchCreateWorkItemsResultDto { Created = created, Errors = errors };
    }

    public async Task<IReadOnlyList<WorkerOptionDto>> GetWorkerOptionsAsync(
        WorkerOptionFilterRequest filter, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.GetByIdAsync(filter.UnitId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy đơn vị báo cáo.");
        var access = await scopeService.GetUnitAccessAsync(unit, cancellationToken);
        if (!access.CanView)
        {
            throw new ForbiddenException("Bạn không có quyền xem đơn vị báo cáo này.");
        }

        var scope = string.IsNullOrWhiteSpace(filter.Scope) ? WorkerOptionScopes.Unit : filter.Scope.Trim().ToUpperInvariant();
        if (!WorkerOptionScopes.All.Contains(scope))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["scope"] = ["Phạm vi phải là UNIT, TEAM hoặc WORKSHOP."],
            });
        }

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var root = scope switch
        {
            WorkerOptionScopes.Team => tree.GetTeam(unit.OrgUnitId) ?? tree.Get(tree.Get(unit.OrgUnitId)?.ParentId ?? 0),
            WorkerOptionScopes.Workshop => tree.GetWorkshop(unit.OrgUnitId),
            _ => tree.Get(unit.OrgUnitId),
        } ?? tree.Get(unit.OrgUnitId);

        var orgUnitIds = new List<int>();
        if (root is not null)
        {
            orgUnitIds.Add(root.Id);
            orgUnitIds.AddRange(tree.GetDescendants(root.Id).Select(x => x.Id));
        }

        var members = await assignmentService.GetUnitMembersAsync(orgUnitIds, cancellationToken);
        var keyword = TextNormalizer.ToKey(filter.Keyword);
        var ownUnitIds = new HashSet<int>(tree.GetDescendants(unit.OrgUnitId).Select(x => x.Id)) { unit.OrgUnitId };

        return members
            .Where(x => keyword.Length == 0
                        || TextNormalizer.ToKey(x.FullName).Contains(keyword)
                        || TextNormalizer.ToKey(x.EmpCode).Contains(keyword))
            .OrderBy(x => ownUnitIds.Contains(x.OrgUnitId) ? 0 : 1)
            .ThenBy(x => x.IsPrimary ? 0 : 1)
            .ThenBy(x => x.FullName)
            .DistinctBy(x => x.EmployeeId)
            .Take(MaxWorkerOptions)
            .Select(x => new WorkerOptionDto
            {
                EmployeeId = x.EmployeeId,
                EmpCode = x.EmpCode,
                FullName = x.FullName,
                OrgUnitName = x.OrgUnitName,
                LevelName = x.LevelName,
            })
            .ToList();
    }

    // ===== Ghi dữ liệu =====

    /// <summary>Gán các trường theo giai đoạn; trường không thuộc giai đoạn được bỏ qua.</summary>
    private static void ApplyFields(
        WorkItem item,
        WorkItemRequestBase request,
        bool isPlan,
        EquipmentDto? equipment,
        IReadOnlyList<(int? EmployeeId, string DisplayName)> workers)
    {
        item.EquipmentId = equipment?.Id;
        item.EquipmentCode = equipment?.Code ?? request.EquipmentCode;
        item.EquipmentName = request.EquipmentName ?? equipment?.Name;
        item.Description = request.Description;
        item.WorkDate = request.WorkDate!.Value;
        item.Note = request.Note;

        if (isPlan)
        {
            item.PlannedMinutes = request.PlannedMinutes;
        }
        else
        {
            item.ActualMinutes = request.ActualMinutes;
            item.ResultPercent = request.ResultPercent;
            item.WorkPermit = request.WorkPermit;
            item.FiveS = request.FiveS;
            item.Explanation = request.Explanation;
        }

        SetWorkers(item, workers);
    }

    /// <summary>Ghi lại danh sách người thực hiện nếu có thay đổi (bảng con, xóa cứng).</summary>
    private static void SetWorkers(WorkItem item, IReadOnlyList<(int? EmployeeId, string DisplayName)> workers)
    {
        var current = item.Workers.OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .Select(x => (x.EmployeeId, x.DisplayName))
            .ToList();
        if (current.SequenceEqual(workers))
        {
            return;
        }

        item.Workers.Clear();
        for (var i = 0; i < workers.Count; i++)
        {
            item.Workers.Add(new WorkItemWorker
            {
                EmployeeId = workers[i].EmployeeId,
                DisplayName = workers[i].DisplayName,
                SortOrder = i + 1,
            });
        }
    }

    private async Task<WorkCategory> GetUsableCategoryAsync(int categoryId, int workshopId, CancellationToken cancellationToken)
    {
        var category = await categoryRepository.GetByIdAsync(categoryId, cancellationToken);
        if (category is null || !WeeklyFormService.IsCategoryUsable(category, workshopId))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["workCategoryId"] = ["Đầu mục không tồn tại, đã ngừng dùng hoặc không áp dụng cho xưởng này."],
            });
        }

        return category;
    }

    /// <summary>Người thực hiện: chọn nhân viên (kiểm tra tồn tại, tên trống = họ tên nhân viên) hoặc tên gõ tự do.</summary>
    private async Task<IReadOnlyList<(int? EmployeeId, string DisplayName)>> BuildWorkersAsync(
        IReadOnlyList<WorkItemWorkerRequest> workers, CancellationToken cancellationToken)
    {
        var employeeIds = workers.Where(x => x.EmployeeId is not null).Select(x => x.EmployeeId!.Value).Distinct().ToList();
        var employees = employeeIds.Count == 0
            ? new Dictionary<int, EmployeeBriefDto>()
            : (await employeeService.GetBriefsAsync(employeeIds, cancellationToken)).ToDictionary(x => x.Id);

        if (employeeIds.Any(x => !employees.ContainsKey(x)))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["workers"] = ["Có người thực hiện không tồn tại trong danh sách nhân viên."],
            });
        }

        return workers
            .Select(x => (x.EmployeeId,
                x.DisplayName ?? (x.EmployeeId is { } id ? employees[id].FullName : string.Empty)))
            .ToList();
    }

    /// <summary>Mã có trong danh mục thiết bị → gắn Id; không có → gõ tự do.</summary>
    private async Task<EquipmentDto?> ResolveEquipmentAsync(string? code, CancellationToken cancellationToken) =>
        code is null ? null : await equipmentService.GetByCodeAsync(code, cancellationToken);

    private static void Normalize(WorkItemRequestBase request)
    {
        request.EquipmentCode = TextNormalizer.TrimToNull(request.EquipmentCode);
        request.EquipmentName = TextNormalizer.TrimToNull(request.EquipmentName);
        request.Description = request.Description?.Trim() ?? string.Empty;
        request.FiveS = TextNormalizer.TrimToNull(request.FiveS);
        request.Explanation = TextNormalizer.TrimToNull(request.Explanation);
        request.Note = TextNormalizer.TrimToNull(request.Note);
        request.PlannedMinutes = request.PlannedMinutes is { } planned ? Math.Round(planned, 2) : null;
        request.ActualMinutes = request.ActualMinutes is { } actual ? Math.Round(actual, 2) : null;
        request.ResultPercent = request.ResultPercent is { } percent ? Math.Round(percent, 2) : null;
        request.Workers = (request.Workers ?? [])
            .Select(x => new WorkItemWorkerRequest
            {
                EmployeeId = x.EmployeeId is > 0 ? x.EmployeeId : null,
                DisplayName = TextNormalizer.TrimToNull(x.DisplayName),
            })
            .Where(x => x.EmployeeId is not null || x.DisplayName is not null)
            .ToList();

        // GPLV nhận nhiều cách viết; không nhận ra thì giữ nguyên để validator báo lỗi
        if (WorkItemInputParser.TryParseWorkPermit(request.WorkPermit, out var permit))
        {
            request.WorkPermit = permit;
        }
    }

    private static byte[] ParseRowVersion(string? rowVersion)
    {
        try
        {
            var bytes = string.IsNullOrWhiteSpace(rowVersion) ? [] : Convert.FromBase64String(rowVersion);
            if (bytes.Length > 0)
            {
                return bytes;
            }
        }
        catch (FormatException)
        {
            // Báo lỗi bên dưới
        }

        throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
        {
            ["rowVersion"] = ["Thiếu hoặc sai rowVersion của dòng; hãy tải lại dữ liệu rồi sửa."],
        });
    }

    // ===== Dán từ Excel =====

    private (CreateWorkItemRequest Request, WorkCategory? Category, Dictionary<string, string[]> Errors) ParseRow(
        PastedWorkItemRow row,
        WeeklyFormContext context,
        IReadOnlyDictionary<string, WorkCategory> categoryByKey,
        Func<string, (int? EmployeeId, string DisplayName)> matchWorker)
    {
        var errors = new Dictionary<string, string[]>();

        var categoryKey = TextNormalizer.ToKey(row.Category);
        WorkCategory? category = null;
        if (categoryKey.Length == 0)
        {
            errors["category"] = ["Vui lòng nhập công việc thực hiện (đầu mục)."];
        }
        else if (!categoryByKey.TryGetValue(categoryKey, out category))
        {
            errors["category"] = [$"Không có đầu mục '{row.Category!.Trim()}' (hoặc không áp dụng cho xưởng)."];
        }

        if (!WorkItemInputParser.TryParseDate(row.WorkDate, context.Week, out var workDate, out var dateError))
        {
            errors["workDate"] = [dateError!];
        }

        var workers = WorkItemInputParser.SplitWorkers(row.Workers)
            .Select(matchWorker)
            .Select(x => new WorkItemWorkerRequest { EmployeeId = x.EmployeeId, DisplayName = x.DisplayName })
            .ToList();

        decimal? planned = null, actual = null, percent = null;
        if (context.IsPlan)
        {
            if (!WorkItemInputParser.TryParseMinutes(row.PlannedMinutes, workers.Count, out planned, out var error))
            {
                errors["plannedMinutes"] = [error!];
            }
        }
        else
        {
            if (!WorkItemInputParser.TryParseMinutes(row.ActualMinutes, workers.Count, out actual, out var error))
            {
                errors["actualMinutes"] = [error!];
            }

            if (!WorkItemInputParser.TryParsePercent(row.ResultPercent, out percent, out var percentError))
            {
                errors["resultPercent"] = [percentError!];
            }
        }

        var request = new CreateWorkItemRequest
        {
            WorkCategoryId = category?.Id ?? 0,
            EquipmentCode = row.EquipmentCode,
            EquipmentName = row.EquipmentName,
            Description = row.Description ?? string.Empty,
            WorkDate = workDate,
            Workers = workers,
            PlannedMinutes = planned,
            ActualMinutes = actual,
            ResultPercent = percent,
            WorkPermit = row.WorkPermit,
            FiveS = row.FiveS,
            Explanation = row.Explanation,
            Note = row.Note,
        };
        Normalize(request);

        // Lỗi đọc ô (ở trên) được ưu tiên hơn lỗi kiểm tra chung
        foreach (var (key, messages) in WorkItemRequestValidator.Collect(
                     request, context.Week, context.IsPlan, isUnplanned: !context.IsPlan, categoryEditable: true))
        {
            var mappedKey = key == "workCategoryId" ? "category" : key;
            errors.TryAdd(mappedKey, messages);
        }

        return (request, category, errors);
    }

    /// <summary>Khớp đầu mục theo giá trị dropdown, tên, hậu tố (bỏ dấu, không phân biệt hoa thường).</summary>
    private static IReadOnlyDictionary<string, WorkCategory> BuildCategoryLookup(IEnumerable<WorkCategory> categories)
    {
        var lookup = new Dictionary<string, WorkCategory>();
        foreach (var category in categories.OrderBy(x => x.SortOrder))
        {
            lookup.TryAdd(TextNormalizer.ToKey(category.Code), category);
        }

        foreach (var category in categories.OrderBy(x => x.SortOrder))
        {
            lookup.TryAdd(TextNormalizer.ToKey(category.Name), category);
            lookup.TryAdd(TextNormalizer.ToKey(category.CodeSuffix), category);
        }

        return lookup;
    }

    /// <summary>
    /// Khớp tên người thực hiện với nhân viên trong xưởng: theo mã NV, hoặc họ tên (bỏ dấu) duy nhất —
    /// ưu tiên người thuộc chính tổ/kíp; trùng tên hoặc không có → giữ tên gõ tự do.
    /// </summary>
    private async Task<Func<string, (int? EmployeeId, string DisplayName)>> BuildWorkerMatcherAsync(
        WeeklyForm form, CancellationToken cancellationToken)
    {
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var unitOrgUnitId = form.WorkReportUnit.OrgUnitId;
        var orgUnitIds = tree.GetDescendants(form.WorkshopId).Select(x => x.Id).Append(form.WorkshopId).ToList();
        var members = (await assignmentService.GetUnitMembersAsync(orgUnitIds, cancellationToken))
            .DistinctBy(x => (x.EmployeeId, x.OrgUnitId))
            .ToList();

        var ownUnitIds = new HashSet<int>(tree.GetDescendants(unitOrgUnitId).Select(x => x.Id)) { unitOrgUnitId };
        var byCode = members.GroupBy(x => x.EmpCode.Trim().ToUpperInvariant())
            .ToDictionary(g => g.Key, g => g.First());
        var byName = members.ToLookup(x => TextNormalizer.ToKey(x.FullName));

        return name =>
        {
            if (byCode.TryGetValue(name.Trim().ToUpperInvariant(), out var byEmpCode))
            {
                return (byEmpCode.EmployeeId, byEmpCode.FullName);
            }

            var candidates = byName[TextNormalizer.ToKey(name)].DistinctBy(x => x.EmployeeId).ToList();
            var inUnit = candidates.Where(x => ownUnitIds.Contains(x.OrgUnitId)).ToList();
            UnitMemberSummaryDto? match = inUnit.Count == 1 ? inUnit[0]
                : inUnit.Count == 0 && candidates.Count == 1 ? candidates[0]
                : null;

            var displayName = name.Length > WorkItemRequestValidator.WorkerNameMaxLength
                ? name[..WorkItemRequestValidator.WorkerNameMaxLength]
                : name;
            return match is null ? (null, displayName) : (match.EmployeeId, match.FullName);
        };
    }

    // ===== Map DTO =====

    private async Task<WorkItemDto> ToDtoAsync(WorkItem item, CancellationToken cancellationToken) =>
        (await ToDtosAsync([item], cancellationToken))[0];

    private async Task<IReadOnlyList<WorkItemDto>> ToDtosAsync(
        IReadOnlyList<WorkItem> items, CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            return [];
        }

        var categories = (await categoryRepository.GetListAsync(includeInactive: true, cancellationToken))
            .ToDictionary(x => x.Id);
        var employeeIds = WorkItemMapper.CollectEmployeeIds(items);
        var employees = employeeIds.Count == 0
            ? new Dictionary<int, EmployeeBriefDto>()
            : (await employeeService.GetBriefsAsync(employeeIds, cancellationToken)).ToDictionary(x => x.Id);

        return items.Select(x => WorkItemMapper.ToDto(x, categories, employees)).ToList();
    }
}
