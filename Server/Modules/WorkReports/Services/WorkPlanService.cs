using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>Kế hoạch tuần: thêm/sửa/xóa tự do trong hạn kế hoạch; quá hạn thì khóa, chỉ admin mở khóa.</summary>
public class WorkPlanService(
    IWorkPlanItemRepository itemRepository,
    IWorkPlanMaterialRepository materialRepository,
    IWeeklyFormRepository formRepository,
    IWeeklyFormService formService,
    WorkItemSupport support,
    IWorkReportNotifier notifier,
    IUnitOfWork unitOfWork) : IWorkPlanService
{
    private const string Phase = WorkReportPhases.Plan;
    private const string NotFoundMessage = "Không tìm thấy dòng kế hoạch (có thể đã bị xóa).";
    private const string ConflictMessage =
        "Dòng kế hoạch vừa được người khác sửa. Hãy xem bản mới nhất rồi chọn giữ bản nào.";

    public Task<WorkGridDto<WeeklyPlanFormDto>> GetGridAsync(
        WorkReportGridRequest request, CancellationToken cancellationToken) =>
        formService.BuildGridAsync<WeeklyPlanFormDto>(request, Phase, async contexts =>
        {
            var items = await itemRepository.GetByFormIdsAsync(
                contexts.Select(x => x.Form.Id).ToList(), cancellationToken);
            var lookups = await support.LoadLookupsAsync(items.SelectMany(x => x.Workers), cancellationToken);
            var itemsByForm = items.ToLookup(x => x.WeeklyFormId);

            IReadOnlyList<WeeklyPlanFormDto> forms = contexts.Select(context =>
            {
                var formItems = WorkItemSupport.OrderForGrid<WorkPlanItem, WorkPlanItemWorker>(
                        itemsByForm[context.Form.Id], lookups.Categories)
                    .Select(x => WorkItemMapper.ToDto(x.Item, lookups.Categories, lookups.Employees, x.Tt))
                    .ToList();
                var total = formItems.Sum(x => x.PlannedMinutes ?? 0);
                var dto = WeeklyFormService.ToFormDto<WeeklyPlanFormDto>(context, formItems.Count, total, total);
                dto.Items = formItems;
                return dto;
            }).ToList();

            await support.FillUpdatedByNamesAsync(forms.SelectMany(x => x.Items), cancellationToken);
            IReadOnlySet<int> usedCategoryIds = items.Select(x => x.WorkCategoryId).ToHashSet();
            return (forms, usedCategoryIds);
        }, cancellationToken);

    public Task<WorkReportSummaryDto> GetSummaryAsync(WorkReportGridRequest request, CancellationToken cancellationToken) =>
        formService.BuildSummaryAsync(
            request,
            Phase,
            async formIds => (await itemRepository.GetByFormIdsAsync(formIds, cancellationToken))
                .Select(x => new SummaryEntry(x.WeeklyFormId, x.WorkCategoryId, x.PlannedMinutes ?? 0))
                .ToList(),
            async formIds => (await materialRepository.GetByFormIdsAsync(formIds, cancellationToken))
                .Select(x => new SummaryMaterial(x.WeeklyFormId, x.MaterialCode, x.MaterialName))
                .ToList(),
            cancellationToken);

    public async Task<WorkPlanItemDto> CreateAsync(int formId, PlanItemRequest request, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, Phase, WorkItemAction.Create, cancellationToken);
        Normalize(request);
        WorkItemRequestValidator.ValidatePlan(request, context.Week, context.Form.LaborType);

        var category = await support.GetUsableCategoryAsync(request.WorkCategoryId, context.Form.WorkshopId, cancellationToken);
        var workers = await support.BuildWorkersAsync(request, context.Form, cancellationToken);
        var wholeGroups = await support.ResolveWholeGroupsAsync(request, context.Form, cancellationToken);
        var engineers = await support.ResolveEngineersAsync(request, context.Form, null, cancellationToken);
        var equipment = await support.ResolveEquipmentAsync(request.EquipmentCode, cancellationToken);

        var item = new WorkPlanItem
        {
            WeeklyFormId = formId,
            WorkCategoryId = category.Id,
            PlannedMinutes = request.PlannedMinutes,
            SortOrder = request.SortOrder
                        ?? await itemRepository.GetMaxSortOrderAsync(formId, cancellationToken) + WorkItemSupport.SortOrderStep,
        };
        WorkItemSupport.ApplyCommonFields(item, request, equipment, workers, () => new WorkPlanItemWorker());
        item.Engineers = engineers;
        item.WholeGroups = wholeGroups;

        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var seq = await formRepository.NextCodeSeqAsync(formId, category.Id, ct);
            item.CodeSeq = seq;
            item.Code = WeeklyFormRules.BuildCode(context.Form.CodePrefix, category.CodeSuffix, seq);
            itemRepository.Add(item);
        }, cancellationToken);

        await notifier.FormChangedAsync(context.Form, Phase);
        return await ToDtoAsync(item, cancellationToken);
    }

    public async Task<WorkPlanItemDto> UpdateAsync(int id, UpdatePlanItemRequest request, CancellationToken cancellationToken)
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

        Normalize(request);
        WorkItemRequestValidator.ValidatePlan(request, context.Week, context.Form.LaborType);

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

        WorkItemSupport.ApplyCommonFields(item, request, equipment, workers, () => new WorkPlanItemWorker());
        item.Engineers = engineers;
        item.WholeGroups = wholeGroups;
        item.PlannedMinutes = request.PlannedMinutes;
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
                    var seq = await formRepository.NextCodeSeqAsync(item.WeeklyFormId, newCategory.Id, ct);
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

    private static void Normalize(PlanItemRequest request)
    {
        WorkItemSupport.NormalizeCommon(request);
        request.PlannedMinutes = WorkItemSupport.RoundOrNull(request.PlannedMinutes);
    }

    private async Task<WorkPlanItemDto> ToDtoAsync(WorkPlanItem item, CancellationToken cancellationToken)
    {
        var lookups = await support.LoadLookupsAsync(item.Workers, cancellationToken);
        var dto = WorkItemMapper.ToDto(item, lookups.Categories, lookups.Employees);
        await support.FillUpdatedByNamesAsync([dto], cancellationToken);
        return dto;
    }
}