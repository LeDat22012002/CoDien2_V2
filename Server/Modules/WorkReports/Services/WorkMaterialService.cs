using Server.Data;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

public class WorkMaterialService(
    IWorkMaterialRepository materialRepository,
    IWorkItemRepository itemRepository,
    IMaterialPurposeRepository purposeRepository,
    IWeeklyFormService formService,
    IUnitOfWork unitOfWork) : IWorkMaterialService
{
    private const string NotFoundMessage = "Không tìm thấy vật tư (có thể đã bị xóa).";

    public async Task<IReadOnlyList<WorkMaterialDto>> GetByFormAsync(
        int formId, string phase, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, phase, forEdit: false, cancellationToken);
        var materials = await materialRepository.GetByFormIdsAsync(
            [formId], includeUnplanned: !context.IsPlan, cancellationToken);

        return materials.Select(x => WorkItemMapper.ToDto(x, context.Form)).ToList();
    }

    public async Task<WorkMaterialDto> CreateAsync(
        int formId, string phase, CreateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var context = await formService.GetContextAsync(formId, phase, forEdit: true, cancellationToken);
        Normalize(request);
        WorkMaterialRequestValidator.Validate(request, context.Week, context.IsPlan);
        await EnsureWorkItemAsync(request.WorkItemId, context, cancellationToken);
        await EnsurePurposeAsync(request.MaterialPurposeId, null, cancellationToken);

        var material = new WorkMaterial
        {
            WeeklyFormId = formId,
            WorkItemId = request.WorkItemId,
            IsUnplanned = !context.IsPlan,
        };
        ApplyFields(material, request, context.IsPlan);

        materialRepository.Add(material);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(material.Id, context, cancellationToken);
    }

    public async Task<WorkMaterialDto> UpdateAsync(
        int id, string phase, UpdateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var material = await materialRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var context = await formService.GetContextAsync(material.WeeklyFormId, phase, forEdit: true, cancellationToken);

        if (context.IsPlan && material.IsUnplanned)
        {
            throw new BusinessException("Vật tư phát sinh chỉ sửa ở giai đoạn báo cáo.");
        }

        Normalize(request);
        WorkMaterialRequestValidator.Validate(request, context.Week, context.IsPlan);
        if (request.WorkItemId != material.WorkItemId)
        {
            await EnsureWorkItemAsync(request.WorkItemId, context, cancellationToken);
        }

        await EnsurePurposeAsync(request.MaterialPurposeId, material.MaterialPurposeId, cancellationToken);

        material.WorkItemId = request.WorkItemId;
        ApplyFields(material, request, context.IsPlan);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, context, cancellationToken);
    }

    public async Task DeleteAsync(int id, string phase, CancellationToken cancellationToken)
    {
        var material = await materialRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var context = await formService.GetContextAsync(material.WeeklyFormId, phase, forEdit: true, cancellationToken);

        if (context.IsPlan && material.IsUnplanned)
        {
            throw new BusinessException("Vật tư phát sinh chỉ xóa ở giai đoạn báo cáo.");
        }

        if (!context.IsPlan && !material.IsUnplanned)
        {
            throw new BusinessException(
                "Không xóa vật tư kế hoạch ở giai đoạn báo cáo. Vật tư không dùng thì nhập số lượng thực tế 0.");
        }

        materialRepository.Remove(material);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<WorkMaterialDto>> GetWorkshopMaterialsAsync(
        WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        var contexts = await formService.GetVisibleFormsAsync(
            filter.WorkshopId, filter.WeekId, filter.Phase, null, cancellationToken);
        if (contexts.Count == 0)
        {
            return [];
        }

        var isPlan = contexts[0].IsPlan;
        var forms = contexts.ToDictionary(x => x.Form.Id);
        var materials = await materialRepository.GetByFormIdsAsync(forms.Keys.ToList(), !isPlan, cancellationToken);

        return materials
            .OrderBy(x => forms[x.WeeklyFormId].OrderNo)
            .ThenBy(x => x.WorkItem.Code)
            .ThenBy(x => x.Id)
            .Select(x => WorkItemMapper.ToDto(x, forms[x.WeeklyFormId].Form))
            .ToList();
    }

    private async Task EnsureWorkItemAsync(int workItemId, WeeklyFormContext context, CancellationToken cancellationToken)
    {
        var item = await itemRepository.GetByIdAsync(workItemId, cancellationToken);
        string? error = null;
        if (item is null || item.WeeklyFormId != context.Form.Id)
        {
            error = "Mã công việc không thuộc form này.";
        }
        else if (context.IsPlan && item.IsUnplanned)
        {
            error = "Dòng phát sinh chỉ gắn vật tư ở giai đoạn báo cáo.";
        }

        if (error is not null)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["workItemId"] = [error],
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

    private static void ApplyFields(WorkMaterial material, WorkMaterialRequestBase request, bool isPlan)
    {
        material.MaterialCode = request.MaterialCode;
        material.MaterialName = request.MaterialName;
        material.Uom = request.Uom;
        material.UsageDate = request.UsageDate;
        material.MaterialPurposeId = request.MaterialPurposeId;
        material.Note = request.Note;

        if (isPlan)
        {
            material.PlannedQuantity = request.PlannedQuantity;
        }
        else
        {
            material.ActualQuantity = request.ActualQuantity;
        }
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
        return WorkItemMapper.ToDto(material, context.Form);
    }
}
