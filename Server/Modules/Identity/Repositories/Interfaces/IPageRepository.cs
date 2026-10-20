using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Repositories.Interfaces;

public interface IPageRepository
{
    /// <summary>Danh sách phẳng mọi trang (kể cả trang ẩn), sắp theo SortOrder.</summary>
    Task<IReadOnlyList<PageDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<Page?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> IsCodeTakenAsync(string code, int? excludeId, CancellationToken cancellationToken);

    Task<bool> IsPathTakenAsync(string path, int? excludeId, CancellationToken cancellationToken);

    Task<bool> HasChildrenAsync(int id, CancellationToken cancellationToken);

    /// <summary>Id → ParentId của mọi trang, dùng để chặn vòng lặp cha-con.</summary>
    Task<Dictionary<int, int?>> GetParentMapAsync(CancellationToken cancellationToken);

    void Add(Page page);

    void Remove(Page page);
}
