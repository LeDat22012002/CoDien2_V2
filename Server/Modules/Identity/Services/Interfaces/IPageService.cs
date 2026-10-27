using Server.Modules.Identity.DTOs;

namespace Server.Modules.Identity.Services.Interfaces;

public interface IPageService
{
    /// <summary>Cây mọi trang (kể cả trang ẩn) cho màn quản lý trang.</summary>
    Task<IReadOnlyList<PageDto>> GetTreeAsync(CancellationToken cancellationToken);

    /// <summary>Cây menu header trang công khai (trang PUBLIC đang hoạt động, hiện trên menu).</summary>
    Task<IReadOnlyList<MenuItemDto>> GetPublicMenuAsync(CancellationToken cancellationToken);

    Task<PageDto> CreateAsync(CreatePageRequest request, CancellationToken cancellationToken);

    Task<PageDto> UpdateAsync(int id, UpdatePageRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
