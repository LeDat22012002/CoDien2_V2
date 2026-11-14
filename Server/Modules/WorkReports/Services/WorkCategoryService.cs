using Server.Data;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>Đầu mục công việc: dùng chung toàn nhà máy, mỗi đầu mục có danh sách xưởng áp dụng (rỗng = mọi xưởng).</summary>
public class WorkCategoryService(
    IWorkCategoryRepository categoryRepository,
    IOrgTreeProvider orgTreeProvider,
    IUnitOfWork unitOfWork) : IWorkCategoryService
{
    private const string NotFoundMessage = "Không tìm thấy đầu mục công việc.";
    private const int SortOrderStep = 10;

    public async Task<IReadOnlyList<WorkCategoryDto>> GetListAsync(
        WorkCategoryFilterRequest filter, CancellationToken cancellationToken)
    {
        var categories = await categoryRepository.GetListAsync(filter.IncludeInactive, cancellationToken);

        return categories
            .Where(x => filter.WorkshopId is not { } workshopId
                        || x.Workshops.Count == 0
                        || x.Workshops.Any(w => w.WorkshopId == workshopId))
            .Select(ToDto)
            .ToList();
    }

    public async Task<WorkCategoryDto> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        ToDto(await categoryRepository.GetByIdAsync(id, cancellationToken)
              ?? throw new NotFoundException(NotFoundMessage));

    public async Task<WorkCategoryDto> CreateAsync(
        CreateWorkCategoryRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        WorkCategoryRequestValidator.Validate(request);
        await EnsureUniqueAsync(request, null, cancellationToken);
        await EnsureWorkshopsValidAsync(request.WorkshopIds, cancellationToken);

        var category = new WorkCategory
        {
            Code = request.Code,
            GroupLetter = request.GroupLetter,
            Name = request.Name,
            CodeSuffix = request.CodeSuffix,
            SortOrder = request.SortOrder
                        ?? await categoryRepository.GetMaxSortOrderAsync(cancellationToken) + SortOrderStep,
            ShowInSummary = request.ShowInSummary,
            IsActive = true,
            Workshops = request.WorkshopIds.Select(x => new WorkCategoryWorkshop { WorkshopId = x }).ToList(),
        };

        categoryRepository.Add(category);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(category);
    }

    public async Task<WorkCategoryDto> UpdateAsync(
        int id, UpdateWorkCategoryRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        WorkCategoryRequestValidator.Validate(request);

        var category = await categoryRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        await EnsureUniqueAsync(request, id, cancellationToken);
        await EnsureWorkshopsValidAsync(request.WorkshopIds, cancellationToken);

        // Đổi hậu tố chỉ áp dụng cho mã sinh sau này; mã công việc đã sinh giữ nguyên
        category.Code = request.Code;
        category.GroupLetter = request.GroupLetter;
        category.Name = request.Name;
        category.CodeSuffix = request.CodeSuffix;
        category.SortOrder = request.SortOrder ?? category.SortOrder;
        category.ShowInSummary = request.ShowInSummary;

        foreach (var workshop in category.Workshops.Where(x => !request.WorkshopIds.Contains(x.WorkshopId)).ToList())
        {
            category.Workshops.Remove(workshop);
            categoryRepository.RemoveWorkshop(workshop);
        }

        var existingIds = category.Workshops.Select(x => x.WorkshopId).ToHashSet();
        foreach (var workshopId in request.WorkshopIds.Where(x => !existingIds.Contains(x)))
        {
            category.Workshops.Add(new WorkCategoryWorkshop { WorkCategoryId = category.Id, WorkshopId = workshopId });
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(category);
    }

    public async Task<WorkCategoryDto> SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken)
    {
        var category = await categoryRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        category.IsActive = isActive;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(category);
    }

    private async Task EnsureUniqueAsync(
        WorkCategoryRequestBase request, int? exceptId, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();

        if (await categoryRepository.IsCodeTakenAsync(request.Code, exceptId, cancellationToken))
        {
            errors["code"] = [$"Giá trị '{request.Code}' đã có ở đầu mục khác."];
        }

        if (await categoryRepository.IsCodeSuffixTakenAsync(request.CodeSuffix, exceptId, cancellationToken))
        {
            errors["codeSuffix"] = [$"Hậu tố '{request.CodeSuffix}' đã dùng cho đầu mục khác."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", errors);
        }
    }

    private async Task EnsureWorkshopsValidAsync(IReadOnlyCollection<int> workshopIds, CancellationToken cancellationToken)
    {
        if (workshopIds.Count == 0)
        {
            return;
        }

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var validIds = tree.GetWorkshops().Select(x => x.Id).ToHashSet();
        if (workshopIds.Any(x => !validIds.Contains(x)))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["workshopIds"] = ["Có xưởng không tồn tại hoặc đã ngừng hoạt động."],
            });
        }
    }

    private static void Normalize(WorkCategoryRequestBase request)
    {
        request.Code = request.Code?.Trim() ?? string.Empty;
        request.GroupLetter = request.GroupLetter?.Trim().ToUpperInvariant() ?? string.Empty;
        request.Name = request.Name?.Trim() ?? string.Empty;
        request.CodeSuffix = request.CodeSuffix?.Trim().ToUpperInvariant() ?? string.Empty;
        request.WorkshopIds = request.WorkshopIds?.Distinct().ToList() ?? [];
    }

    private static WorkCategoryDto ToDto(WorkCategory category) => new()
    {
        Id = category.Id,
        Code = category.Code,
        GroupLetter = category.GroupLetter,
        Name = category.Name,
        CodeSuffix = category.CodeSuffix,
        SortOrder = category.SortOrder,
        ShowInSummary = category.ShowInSummary,
        IsActive = category.IsActive,
        WorkshopIds = category.Workshops.Select(x => x.WorkshopId).OrderBy(x => x).ToList(),
    };
}