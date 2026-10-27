using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Repositories.Interfaces;

public interface IPageRepository
{
    /// <summary>Danh sách phẳng mọi trang (kể cả trang ẩn), sắp theo SortOrder.</summary>
    Task<IReadOnlyList<PageDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<Page?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> IsCodeTakenAsync(string code, int? excludeId, CancellationToken cancellationToken);

    /// <summary>Path chỉ cần duy nhất trong cùng Area (menu public được trỏ tới route của trang quản trị).</summary>
    Task<bool> IsPathTakenAsync(string path, string area, int? excludeId, CancellationToken cancellationToken);

    /// <summary>Area của trang, null nếu không tồn tại.</summary>
    Task<string?> GetAreaAsync(int id, CancellationToken cancellationToken);

    Task<bool> HasChildrenAsync(int id, CancellationToken cancellationToken);

    Task<bool> HasChildrenOutsideAreaAsync(int id, string area, CancellationToken cancellationToken);

    /// <summary>Id → ParentId của mọi trang, dùng để chặn vòng lặp cha-con.</summary>
    Task<Dictionary<int, int?>> GetParentMapAsync(CancellationToken cancellationToken);

    void Add(Page page);

    void Remove(Page page);
}
