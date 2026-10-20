using Server.Data;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;
using Server.Modules.Identity.Services.Interfaces;
using Server.Modules.Identity.Validators;
using Server.Shared.Exceptions;
using Server.Shared.Extensions;

namespace Server.Modules.Identity.Services;

public class PageService(
    IPageRepository pageRepository,
    IPermissionRepository permissionRepository,
    IUnitOfWork unitOfWork) : IPageService
{
    private const string PageNotFoundMessage = "Không tìm thấy trang.";

    public async Task<IReadOnlyList<PageDto>> GetTreeAsync(CancellationToken cancellationToken)
    {
        var pages = await pageRepository.GetAllAsync(cancellationToken);
        var lookup = pages.ToDictionary(x => x.Id);

        foreach (var page in pages.Where(x => x.ParentId is not null && lookup.ContainsKey(x.ParentId.Value)))
        {
            lookup[page.ParentId!.Value].Children.Add(page);
        }

        return pages.Where(x => x.ParentId is null).ToList();
    }

    public async Task<PageDto> CreateAsync(CreatePageRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        PageRequestValidator.Validate(request);
        await ValidateReferencesAsync(request, null, cancellationToken);

        var page = new Page();
        Apply(page, request);
        pageRepository.Add(page);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(page.Id, cancellationToken);
    }

    public async Task<PageDto> UpdateAsync(int id, UpdatePageRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        PageRequestValidator.Validate(request);

        var page = await pageRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(PageNotFoundMessage);

        await ValidateReferencesAsync(request, id, cancellationToken);

        Apply(page, request);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(page.Id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var page = await pageRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(PageNotFoundMessage);

        if (await pageRepository.HasChildrenAsync(id, cancellationToken))
        {
            throw new BusinessException("Trang đang có trang con. Hãy xóa hoặc chuyển các trang con sang nhóm khác trước.");
        }

        pageRepository.Remove(page);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task ValidateReferencesAsync(PageRequestBase request, int? pageId, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();

        if (await pageRepository.IsCodeTakenAsync(request.Code, pageId, cancellationToken))
        {
            errors["code"] = [$"Mã trang '{request.Code}' đã tồn tại."];
        }

        if (request.Path is not null && await pageRepository.IsPathTakenAsync(request.Path, pageId, cancellationToken))
        {
            errors["path"] = [$"Đường dẫn '{request.Path}' đã được dùng cho trang khác."];
        }

        if (request.PermissionId is { } permissionId
            && (await permissionRepository.GetExistingIdsAsync([permissionId], cancellationToken)).Count == 0)
        {
            errors["permissionId"] = ["Quyền không tồn tại."];
        }

        if (request.ParentId is { } parentId)
        {
            var parentMap = await pageRepository.GetParentMapAsync(cancellationToken);
            if (!parentMap.ContainsKey(parentId))
            {
                errors["parentId"] = ["Trang cha không tồn tại."];
            }
            else if (pageId is not null && IsSelfOrDescendant(parentId, pageId.Value, parentMap))
            {
                errors["parentId"] = ["Không thể chọn chính trang này hoặc trang con của nó làm trang cha."];
            }
        }

        errors.ThrowIfInvalid();
    }

    /// <summary>Đi ngược từ candidateId lên gốc; gặp pageId nghĩa là candidateId nằm trong cây con của pageId.</summary>
    private static bool IsSelfOrDescendant(int candidateId, int pageId, Dictionary<int, int?> parentMap)
    {
        var visited = new HashSet<int>();
        int? currentId = candidateId;
        while (currentId is { } id && visited.Add(id))
        {
            if (id == pageId)
            {
                return true;
            }

            currentId = parentMap.GetValueOrDefault(id);
        }

        return false;
    }

    private async Task<PageDto> GetDtoAsync(int id, CancellationToken cancellationToken) =>
        (await pageRepository.GetAllAsync(cancellationToken)).First(x => x.Id == id);

    private static void Normalize(PageRequestBase request)
    {
        request.Code = request.Code?.Trim().ToLowerInvariant() ?? string.Empty;
        request.Title = request.Title?.Trim() ?? string.Empty;
        request.Path = string.IsNullOrWhiteSpace(request.Path) ? null : request.Path.Trim();
        request.Icon = string.IsNullOrWhiteSpace(request.Icon) ? null : request.Icon.Trim();
    }

    private static void Apply(Page page, PageRequestBase request)
    {
        page.Code = request.Code;
        page.Title = request.Title;
        page.Path = request.Path;
        page.Icon = request.Icon;
        page.ParentId = request.ParentId;
        page.PermissionId = request.PermissionId;
        page.SortOrder = request.SortOrder;
        page.IsMenu = request.IsMenu;
        page.IsActive = request.IsActive;
    }
}
