using Server.Data;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Entities;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Vật tư của 1 giai đoạn: gắn bắt buộc vào 1 dòng cùng giai đoạn của form; thêm/sửa/xóa theo quyền thêm/sửa/xóa dòng
/// của giai đoạn đó và chỉ khi giai đoạn đang mở.
/// </summary>
public abstract class WorkMaterialServiceBase<TMaterial, TItem>(
    IWorkMaterialRepository<TMaterial> materialRepository,
    IWorkItemRepository<TItem> itemRepository,
    IMaterialPurposeRepository purposeRepository,
    IWeeklyFormService formService,
    IWorkReportNotifier notifier,
    IUnitOfWork unitOfWork) : IWorkMaterialService
    where TMaterial : WorkMaterialBase
    where TItem : BaseEntity
{
    private const string NotFoundMessage = "Không tìm thấy vật tư (có thể đã bị xóa).";

    protected abstract string Phase { get; }

    protected abstract int ItemIdOf(TMaterial material);

    protected abstract int WeeklyFormIdOf(TItem item);

    protected abstract TMaterial Create(int formId, int itemId);

    /// <summary>Gán số lượng của giai đoạn và dòng được gắn.</summary>
    protected abstract void ApplyQuantity(TMaterial material, WorkMaterialRequestBase request, int itemId);

    protected abstract WorkMaterialDto ToDto(TMaterial material, WeeklyForm form, TItem? item);

    public async Task<IReadOnlyList<WorkMaterialDto>> GetByFormAsync(int formId, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, Phase, WorkItemAction.View, cancellationToken);
        return await MapAsync([formId], new Dictionary<int, WeeklyFormContext> { [formId] = context }, cancellationToken);
    }

    public async Task<IReadOnlyList<WorkMaterialDto>> GetWorkshopMaterialsAsync(
        WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        var contexts = await formService.GetVisibleFormsAsync(filter.WorkshopId, filter.WeekId, Phase, null, cancellationToken);
        if (contexts.Count == 0)
        {
            return [];
        }

        var forms = contexts.ToDictionary(x => x.Form.Id);
        return await MapAsync(forms.Keys.ToList(), forms, cancellationToken);
    }

    public async Task<WorkMaterialDto> CreateAsync(
        int formId, CreateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, Phase, WorkItemAction.Create, cancellationToken);
        Normalize(request);
        WorkMaterialRequestValidator.Validate(request, context.Week, context.IsPlan);
        await EnsureWorkItemAsync(request.WorkItemId, formId, cancellationToken);
        await EnsurePurposeAsync(request.MaterialPurposeId, null, cancellationToken);

        var material = Create(formId, request.WorkItemId);
        ApplyFields(material, request);

        materialRepository.Add(material);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await notifier.FormChangedAsync(context.Form, Phase);

        return await GetDtoAsync(material.Id, context, cancellationToken);
    }

    public async Task<WorkMaterialDto> UpdateAsync(
        int id, UpdateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var material = await materialRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var context = await formService.GetContextAsync(material.WeeklyFormId, Phase, WorkItemAction.Update, cancellationToken);

        Normalize(request);
        WorkMaterialRequestValidator.Validate(request, context.Week, context.IsPlan);
        if (request.WorkItemId != ItemIdOf(material))
        {
            await EnsureWorkItemAsync(request.WorkItemId, material.WeeklyFormId, cancellationToken);
        }

        await EnsurePurposeAsync(request.MaterialPurposeId, material.MaterialPurposeId, cancellationToken);

        ApplyFields(material, request);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await notifier.FormChangedAsync(context.Form, Phase);

        return await GetDtoAsync(id, context, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var material = await materialRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var context = await formService.GetContextAsync(
            material.WeeklyFormId, Phase, WorkItemAction.Delete, cancellationToken);

        materialRepository.Remove(material);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        await notifier.FormChangedAsync(context.Form, Phase);
    }

    private async Task<IReadOnlyList<WorkMaterialDto>> MapAsync(
        IReadOnlyList<int> formIds,
        IReadOnlyDictionary<int, WeeklyFormContext> contexts,
        CancellationToken cancellationToken)
    {
        var materials = await materialRepository.GetByFormIdsAsync(formIds, cancellationToken);
        var items = await GetItemsAsync(materials, cancellationToken);

        return materials
            .Select(x => (Material: x, Item: items.GetValueOrDefault(ItemIdOf(x))))
            .Select(x => ToDto(x.Material, contexts[x.Material.WeeklyFormId].Form, x.Item))
            .OrderBy(x => contexts[x.WeeklyFormId].OrderNo)
            .ThenBy(x => x.WorkItemCode)
            .ThenBy(x => x.Id)
            .ToList();
    }

    private async Task<IReadOnlyDictionary<int, TItem>> GetItemsAsync(
        IEnumerable<TMaterial> materials, CancellationToken cancellationToken)
    {
        var ids = materials.Select(ItemIdOf).Distinct().ToList();
        var items = await itemRepository.GetByIdsAsync(ids, cancellationToken);
        return items.ToDictionary(x => x.Id);
    }

    private async Task EnsureWorkItemAsync(int workItemId, int formId, CancellationToken cancellationToken)
    {
        var item = await itemRepository.GetByIdAsync(workItemId, cancellationToken);
        if (item is null || WeeklyFormIdOf(item) != formId)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["workItemId"] = ["Mã công việc không thuộc form này."],
            });
        }
    }

    /// <summary>Mục đích phải đang dùng (giữ nguyên mục đích cũ đã ngừng thì vẫn cho lưu).</summary>
    private async Task EnsurePurposeAsync(int? purposeId, int? currentPurposeId, CancellationToken cancellationToken)
    {
        if (purposeId is null || purposeId == currentPurposeId)
        {
            return;
        }

        var purposes = await purposeRepository.GetListAsync(includeInactive: false, cancellationToken);
        if (purposes.All(x => x.Id != purposeId))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["materialPurposeId"] = ["Mục đích sử dụng không tồn tại hoặc đã ngừng dùng."],
            });
        }
    }

    private void ApplyFields(TMaterial material, WorkMaterialRequestBase request)
    {
        material.MaterialCode = request.MaterialCode;
        material.MaterialName = request.MaterialName;
        material.Uom = request.Uom;
        material.UsageDate = request.UsageDate;
        material.MaterialPurposeId = request.MaterialPurposeId;
        material.Note = request.Note;
        ApplyQuantity(material, request, request.WorkItemId);
    }

    private static void Normalize(WorkMaterialRequestBase request)
    {
        request.MaterialCode = TextNormalizer.TrimToNull(request.MaterialCode);
        request.MaterialName = request.MaterialName?.Trim() ?? string.Empty;
        request.Uom = TextNormalizer.TrimToNull(request.Uom);
        request.Note = TextNormalizer.TrimToNull(request.Note);
        request.MaterialPurposeId = request.MaterialPurposeId is > 0 ? request.MaterialPurposeId : null;
    }

    private async Task<WorkMaterialDto> GetDtoAsync(int id, WeeklyFormContext context, CancellationToken cancellationToken)
    {
        var material = await materialRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var item = await itemRepository.GetByIdAsync(ItemIdOf(material), cancellationToken);
        return ToDto(material, context.Form, item);
    }
}

public class WorkPlanMaterialService(
    IWorkPlanMaterialRepository materialRepository,
    IWorkPlanItemRepository itemRepository,
    IMaterialPurposeRepository purposeRepository,
    IWeeklyFormService formService,
    IWorkReportNotifier notifier,
    IUnitOfWork unitOfWork)
    : WorkMaterialServiceBase<WorkPlanMaterial, WorkPlanItem>(
        materialRepository, itemRepository, purposeRepository, formService, notifier, unitOfWork), IWorkPlanMaterialService
{
    protected override string Phase => WorkReportPhases.Plan;

    protected override int ItemIdOf(WorkPlanMaterial material) => material.WorkPlanItemId;

    protected override int WeeklyFormIdOf(WorkPlanItem item) => item.WeeklyFormId;

    protected override WorkPlanMaterial Create(int formId, int itemId) =>
        new() { WeeklyFormId = formId, WorkPlanItemId = itemId };

    protected override void ApplyQuantity(WorkPlanMaterial material, WorkMaterialRequestBase request, int itemId)
    {
        material.WorkPlanItemId = itemId;
        material.Quantity = request.PlannedQuantity;
    }

    protected override WorkMaterialDto ToDto(WorkPlanMaterial material, WeeklyForm form, WorkPlanItem? item) =>
        WorkItemMapper.ToDto(material, form, item);
}

public class WorkReportMaterialService(
    IWorkReportMaterialRepository materialRepository,
    IWorkReportItemRepository itemRepository,
    IMaterialPurposeRepository purposeRepository,
    IWeeklyFormService formService,
    IWorkReportNotifier notifier,
    IUnitOfWork unitOfWork)
    : WorkMaterialServiceBase<WorkReportMaterial, WorkReportItem>(
        materialRepository, itemRepository, purposeRepository, formService, notifier, unitOfWork), IWorkReportMaterialService
{
    protected override string Phase => WorkReportPhases.Report;

    protected override int ItemIdOf(WorkReportMaterial material) => material.WorkReportItemId;

    protected override int WeeklyFormIdOf(WorkReportItem item) => item.WeeklyFormId;

    protected override WorkReportMaterial Create(int formId, int itemId) =>
        new() { WeeklyFormId = formId, WorkReportItemId = itemId };

    /// <summary>Số kế hoạch chỉ có khi chép từ kế hoạch (giữ nguyên); người dùng nhập số thực tế.</summary>
    protected override void ApplyQuantity(WorkReportMaterial material, WorkMaterialRequestBase request, int itemId)
    {
        material.WorkReportItemId = itemId;
        material.ActualQuantity = request.ActualQuantity;
    }

    protected override WorkMaterialDto ToDto(WorkReportMaterial material, WeeklyForm form, WorkReportItem? item) =>
        WorkItemMapper.ToDto(material, form, item);
}
