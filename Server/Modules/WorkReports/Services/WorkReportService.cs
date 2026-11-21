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
/// Báo cáo tuần: thêm/sửa/xóa tự do trong từng đầu mục khi báo cáo đang mở; lưu xong là trang xem thấy ngay.
/// Dòng kế hoạch chưa đưa vào báo cáo là gợi ý, chỉ trả cho người đang thêm được dòng báo cáo của tổ/kíp.
/// </summary>
public class WorkReportService(
    IWorkReportItemRepository itemRepository,
    IWorkPlanItemRepository planItemRepository,
    IWorkReportMaterialRepository materialRepository,
    IWorkPlanMaterialRepository planMaterialRepository,
    IWeeklyFormRepository formRepository,
    IWeeklyFormService formService,
    WorkItemSupport support,
    IWorkReportNotifier notifier,
    IUnitOfWork unitOfWork) : IWorkReportService
{
    private const string Phase = WorkReportPhases.Report;
    private const string NotFoundMessage = "Không tìm thấy dòng báo cáo (có thể đã bị xóa).";
    private const string ConflictMessage =
        "Dòng báo cáo vừa được người khác sửa. Hãy xem bản mới nhất rồi chọn giữ bản nào.";
    private const int MaxAcceptItems = 1000;

    public Task<WorkGridDto<WeeklyReportFormDto>> GetGridAsync(
        WorkReportGridRequest request, CancellationToken cancellationToken) =>
        formService.BuildGridAsync<WeeklyReportFormDto>(request, Phase, async contexts =>
        {
            var items = await itemRepository.GetByFormIdsAsync(
                contexts.Select(x => x.Form.Id).ToList(), cancellationToken);

            // Gợi ý từ kế hoạch: chỉ cho form người gọi đang thêm được dòng báo cáo
            var suggestFormIds = contexts.Where(x => x.CanCreateNow).Select(x => x.Form.Id).ToList();
            var acceptedPlanIds = items.Where(x => x.PlanItemId is not null).Select(x => x.PlanItemId!.Value).ToHashSet();
            var suggestions = (await planItemRepository.GetByFormIdsAsync(suggestFormIds, cancellationToken))
                .Where(x => !acceptedPlanIds.Contains(x.Id))
                .ToList();

            // Mã KH của dòng đưa từ kế hoạch (mã báo cáo đánh riêng; rê chuột mã để đối chiếu)
            var planCodes = (await planItemRepository.GetByIdsAsync(acceptedPlanIds, cancellationToken))
                .ToDictionary(x => x.Id, x => x.Code);

            var lookups = await support.LoadLookupsAsync(
                items.SelectMany(x => (IEnumerable<WorkItemWorkerBase>)x.Workers)
                    .Concat(suggestions.SelectMany(x => x.Workers)),
                cancellationToken);
            var itemsByForm = items.ToLookup(x => x.WeeklyFormId);
            var suggestionsByForm = suggestions.ToLookup(x => x.WeeklyFormId);

            IReadOnlyList<WeeklyReportFormDto> forms = contexts.Select(context =>
            {
                var formItems = WorkItemSupport.OrderForGrid<WorkReportItem, WorkReportItemWorker>(
                        itemsByForm[context.Form.Id], lookups.Categories)
                    .Select(x =>
                    {
                        var itemDto = WorkItemMapper.ToDto(x.Item, lookups.Categories, lookups.Employees, x.Tt);
                        itemDto.PlanCode = x.Item.PlanItemId is { } planId ? planCodes.GetValueOrDefault(planId) : null;
                        return itemDto;
                    })
                    .ToList();
                var dto = WeeklyFormService.ToFormDto<WeeklyReportFormDto>(
                    context,
                    formItems.Count,
                    formItems.Sum(x => x.PlannedMinutes ?? 0),
                    formItems.Sum(x => x.EffectiveActualMinutes));
                dto.Items = formItems;
                dto.Suggestions = WorkItemSupport.OrderForGrid<WorkPlanItem, WorkPlanItemWorker>(
                        suggestionsByForm[context.Form.Id], lookups.Categories)
                    .Select(x => WorkItemMapper.ToDto(x.Item, lookups.Categories, lookups.Employees))
                    .ToList();
                return dto;
            }).ToList();

            await support.FillUpdatedByNamesAsync(forms.SelectMany(x => x.Items), cancellationToken);
            IReadOnlySet<int> usedCategoryIds = items.Select(x => x.WorkCategoryId)
                .Concat(suggestions.Select(x => x.WorkCategoryId))
                .ToHashSet();
            return (forms, usedCategoryIds);
        }, cancellationToken);

    public Task<WorkReportSummaryDto> GetSummaryAsync(WorkReportGridRequest request, CancellationToken cancellationToken) =>
        formService.BuildSummaryAsync(
            request,
            Phase,
            async formIds => (await itemRepository.GetByFormIdsAsync(formIds, cancellationToken))
                .Select(x => new SummaryEntry(x.WeeklyFormId, x.WorkCategoryId, WorkItemMapper.EffectiveActualMinutes(x)))
                .ToList(),
            async formIds => (await materialRepository.GetByFormIdsAsync(formIds, cancellationToken))
                .Select(x => new SummaryMaterial(x.WeeklyFormId, x.MaterialCode, x.MaterialName))
                .ToList(),
            cancellationToken);

    public async Task<WorkReportItemDto> CreateAsync(int formId, ReportItemRequest request, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, Phase, WorkItemAction.Create, cancellationToken);
        Normalize(request);
        WorkItemRequestValidator.ValidateReport(request, context.Week, context.Form.LaborType, isUnplanned: true);

        var category = await support.GetUsableCategoryAsync(request.WorkCategoryId, context.Form.WorkshopId, cancellationToken);
        var workers = await support.BuildWorkersAsync(request, context.Form, cancellationToken);
        var wholeGroups = await support.ResolveWholeGroupsAsync(request, context.Form, cancellationToken);
        var engineers = await support.ResolveEngineersAsync(request, context.Form, null, cancellationToken);
        var equipment = await support.ResolveEquipmentAsync(request.EquipmentCode, cancellationToken);

        var item = new WorkReportItem
        {
            WeeklyFormId = formId,
            WorkCategoryId = category.Id,
            SortOrder = request.SortOrder
                        ?? await itemRepository.GetMaxSortOrderAsync(formId, cancellationToken) + WorkItemSupport.SortOrderStep,
        };
        ApplyFields(item, request, equipment, workers);
        item.Engineers = engineers;
        item.WholeGroups = wholeGroups;

        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var seq = await formRepository.NextCodeSeqAsync(formId, Phase, category.Id, ct);
            item.CodeSeq = seq;
            item.Code = WeeklyFormRules.BuildCode(context.Form.CodePrefix, category.CodeSuffix, seq);
            itemRepository.Add(item);
        }, cancellationToken);

        await notifier.FormChangedAsync(context.Form, Phase);
        return await ToDtoAsync(item, cancellationToken);
    }

    public async Task<IReadOnlyList<WorkReportItemDto>> AcceptPlanItemsAsync(
        int formId, AcceptPlanItemsRequest request, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, Phase, WorkItemAction.Create, cancellationToken);

        var ids = (request.PlanItemIds ?? []).Where(x => x > 0).Distinct().ToList();
        if (ids.Count == 0 || ids.Count > MaxAcceptItems)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["planItemIds"] = [$"Chọn từ 1 đến {MaxAcceptItems} dòng kế hoạch."],
            });
        }

        var planItems = await planItemRepository.GetByIdsAsync(ids, cancellationToken);
        if (planItems.Count != ids.Count || planItems.Any(x => x.WeeklyFormId != formId))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["planItemIds"] = ["Có dòng kế hoạch không thuộc tổ/kíp này hoặc đã bị xóa. Hãy tải lại bảng."],
            });
        }

        var accepted = await itemRepository.GetAcceptedPlanItemIdsAsync(formId, cancellationToken);
        var categories = (await support.LoadLookupsAsync([], cancellationToken)).Categories;
        // Cấp mã báo cáo theo thứ tự đầu mục, trong đầu mục theo mã kế hoạch
        var toAccept = planItems
            .Where(x => !accepted.Contains(x.Id))
            .OrderBy(x => categories.GetValueOrDefault(x.WorkCategoryId)?.SortOrder ?? int.MaxValue)
            .ThenBy(x => x.WorkCategoryId)
            .ThenBy(x => x.CodeSeq).ThenBy(x => x.Id)
            .ToList();
        if (toAccept.Count == 0)
        {
            throw new BusinessException("Các dòng kế hoạch đã chọn đều đã có trong báo cáo.");
        }

        var planMaterials = (await planMaterialRepository.FindByItemIdsAsync(
                toAccept.Select(x => x.Id).ToList(), cancellationToken))
            .ToLookup(x => x.WorkPlanItemId);

        var created = new List<WorkReportItem>();
        foreach (var plan in toAccept)
        {
            var item = new WorkReportItem
            {
                WeeklyFormId = formId,
                WorkCategoryId = plan.WorkCategoryId,
                PlanItemId = plan.Id,
                // Mã: cấp mã báo cáo mới bên dưới (kế hoạch và báo cáo đánh mã riêng); mã KH xem qua PlanCode
                EquipmentId = plan.EquipmentId,
                EquipmentCode = plan.EquipmentCode,
                EquipmentName = plan.EquipmentName,
                Description = plan.Description,
                StartDate = plan.StartDate,
                EndDate = plan.EndDate,
                Note = plan.Note,
                IsWholeUnit = plan.IsWholeUnit,
                WholeGroups = plan.WholeGroups
                    .Select(x => new WorkItemGroup { OrgUnitId = x.OrgUnitId, Name = x.Name })
                    .ToList(),
                // KTV phụ trách: chép của dòng kế hoạch (người dùng chốt); dòng KH cũ chưa có thì để trống
                Engineers = plan.Engineers
                    .Select(x => new WorkItemEngineer { EmployeeId = x.EmployeeId, FullName = x.FullName })
                    .ToList(),
                PlannedMinutes = plan.PlannedMinutes,
                SortOrder = plan.SortOrder,
                Workers = plan.Workers
                    .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                    .Select(x => new WorkReportItemWorker
                    {
                        EmployeeId = x.EmployeeId,
                        DisplayName = x.DisplayName,
                        SortOrder = x.SortOrder,
                    })
                    .ToList(),
            };
            itemRepository.Add(item);
            created.Add(item);

            foreach (var material in planMaterials[plan.Id])
            {
                materialRepository.Add(new WorkReportMaterial
                {
                    WeeklyFormId = formId,
                    WorkReportItem = item,
                    PlanMaterialId = material.Id,
                    PlannedQuantity = material.Quantity,
                    MaterialCode = material.MaterialCode,
                    MaterialName = material.MaterialName,
                    Uom = material.Uom,
                    UsageDate = material.UsageDate,
                    MaterialPurposeId = material.MaterialPurposeId,
                    Note = material.Note,
                });
            }
        }

        try
        {
            await unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                // Dòng KH vào báo cáo nhận số tiếp theo của báo cáo (như dòng mới thêm) nên nhập xen kẽ vẫn liền số
                foreach (var item in created)
                {
                    var seq = await formRepository.NextCodeSeqAsync(formId, Phase, item.WorkCategoryId, ct);
                    item.CodeSeq = seq;
                    item.Code = WeeklyFormRules.BuildCode(
                        context.Form.CodePrefix, categories[item.WorkCategoryId].CodeSuffix, seq);
                }
            }, cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index PlanItemId: người khác vừa đưa cùng dòng kế hoạch vào báo cáo
            throw new BusinessException("Có dòng kế hoạch vừa được người khác đưa vào báo cáo. Hãy tải lại bảng rồi thử lại.");
        }

        await notifier.FormChangedAsync(context.Form, Phase);

        var lookups = await support.LoadLookupsAsync(created.SelectMany(x => x.Workers), cancellationToken);
        var planCodes = toAccept.ToDictionary(x => x.Id, x => x.Code);
        var dtos = created.Select(x =>
        {
            var dto = WorkItemMapper.ToDto(x, lookups.Categories, lookups.Employees);
            dto.PlanCode = x.PlanItemId is { } planId ? planCodes.GetValueOrDefault(planId) : null;
            return dto;
        }).ToList();
        await support.FillUpdatedByNamesAsync(dtos, cancellationToken);
        return dtos;
    }

    public async Task<WorkReportItemDto> UpdateAsync(int id, UpdateReportItemRequest request, CancellationToken cancellationToken)
    {
        var item = await itemRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var context = await formService.GetContextAsync(item.WeeklyFormId, Phase, WorkItemAction.Update, cancellationToken);
        await support.EnsureRowEngineerAsync(context, item.Engineers, WorkItemAction.Update, cancellationToken);

        var clientRowVersion = WorkItemSupport.ParseRowVersion(request.RowVersion);
        if (!clientRowVersion.SequenceEqual(item.RowVersion))
        {
            throw new ConflictException(ConflictMessage, await ToDtoAsync(item, cancellationToken));
        }

        var isUnplanned = item.PlanItemId is null;
        if (!isUnplanned)
        {
            // Dòng lấy từ kế hoạch giữ đầu mục và mã công việc của kế hoạch
            request.WorkCategoryId = item.WorkCategoryId;
        }

        Normalize(request);
        WorkItemRequestValidator.ValidateReport(request, context.Week, context.Form.LaborType, isUnplanned);

        WorkCategory? newCategory = null;
        if (request.WorkCategoryId != item.WorkCategoryId)
        {
            newCategory = await support.GetUsableCategoryAsync(request.WorkCategoryId, context.Form.WorkshopId, cancellationToken);
        }

        var workers = await support.BuildWorkersAsync(request, context.Form, cancellationToken);
        var wholeGroups = await support.ResolveWholeGroupsAsync(request, context.Form, cancellationToken);
        var engineers = await support.ResolveEngineersAsync(
            request, context.Form, item.Engineers, cancellationToken);
        var equipment = await support.ResolveEquipmentAsync(request.EquipmentCode, cancellationToken);

        ApplyFields(item, request, equipment, workers);
        item.Engineers = engineers;
        item.WholeGroups = wholeGroups;
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
                await unitOfWork.ExecuteInTransactionAsync(async ct =>
                {
                    var seq = await formRepository.NextCodeSeqAsync(item.WeeklyFormId, Phase, newCategory.Id, ct);
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

        await notifier.FormChangedAsync(context.Form, Phase);
        return await ToDtoAsync(item, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var item = await itemRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var context = await formService.GetContextAsync(item.WeeklyFormId, Phase, WorkItemAction.Delete, cancellationToken);
        await support.EnsureRowEngineerAsync(context, item.Engineers, WorkItemAction.Delete, cancellationToken);

        foreach (var material in await materialRepository.FindByItemIdsAsync([id], cancellationToken))
        {
            materialRepository.Remove(material);
        }

        itemRepository.Remove(item);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await notifier.FormChangedAsync(context.Form, Phase);
    }

    private static void ApplyFields(
        WorkReportItem item,
        ReportItemRequest request,
        Equipments.DTOs.EquipmentDto? equipment,
        IReadOnlyList<(int? EmployeeId, string DisplayName)> workers)
    {
        WorkItemSupport.ApplyCommonFields(item, request, equipment, workers, () => new WorkReportItemWorker());
        if (item.PlanItemId is null)
        {
            // Dòng thêm ở báo cáo: người nhập tự điền giờ KH; dòng từ kế hoạch giữ giờ KH đã chụp
            item.PlannedMinutes = request.PlannedMinutes;
        }

        item.ActualMinutes = request.ActualMinutes;
        item.ResultPercent = request.ResultPercent;
        item.WorkPermit = request.WorkPermit;
        item.FiveS = request.FiveS;
        item.Explanation = request.Explanation;
    }

    private static void Normalize(ReportItemRequest request)
    {
        WorkItemSupport.NormalizeCommon(request);
        request.PlannedMinutes = WorkItemSupport.RoundOrNull(request.PlannedMinutes);
        request.ActualMinutes = WorkItemSupport.RoundOrNull(request.ActualMinutes);
        request.ResultPercent = WorkItemSupport.RoundOrNull(request.ResultPercent);
        request.FiveS = TextNormalizer.TrimToNull(request.FiveS);
        request.Explanation = TextNormalizer.TrimToNull(request.Explanation);

        // GPLV nhận nhiều cách viết; không nhận ra thì giữ nguyên để validator báo lỗi
        if (WorkItemSupport.TryParseWorkPermit(request.WorkPermit, out var permit))
        {
            request.WorkPermit = permit;
        }
    }

    private async Task<WorkReportItemDto> ToDtoAsync(WorkReportItem item, CancellationToken cancellationToken)
    {
        var lookups = await support.LoadLookupsAsync(item.Workers, cancellationToken);
        var dto = WorkItemMapper.ToDto(item, lookups.Categories, lookups.Employees);
        if (item.PlanItemId is { } planId)
        {
            dto.PlanCode = (await planItemRepository.GetByIdAsync(planId, cancellationToken))?.Code;
        }

        await support.FillUpdatedByNamesAsync([dto], cancellationToken);
        return dto;
    }
}