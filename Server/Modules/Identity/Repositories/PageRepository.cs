using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;

namespace Server.Modules.Identity.Repositories;

public class PageRepository(AppDbContext dbContext) : IPageRepository
{
    private DbSet<Page> Pages => dbContext.Set<Page>();

    public async Task<IReadOnlyList<PageDto>> GetAllAsync(CancellationToken cancellationToken) =>
        await Pages.AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Title)
            .Select(x => new PageDto
            {
                Id = x.Id,
                Code = x.Code,
                Title = x.Title,
                Path = x.Path,
                Icon = x.Icon,
                ParentId = x.ParentId,
                PermissionId = x.PermissionId,
                PermissionCode = x.Permission != null ? x.Permission.Code : null,
                SortOrder = x.SortOrder,
                IsMenu = x.IsMenu,
                IsActive = x.IsActive,
            })
            .ToListAsync(cancellationToken);

    public Task<Page?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Pages.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> IsCodeTakenAsync(string code, int? excludeId, CancellationToken cancellationToken) =>
        Pages.AnyAsync(x => x.Code == code && (excludeId == null || x.Id != excludeId), cancellationToken);

    public Task<bool> IsPathTakenAsync(string path, int? excludeId, CancellationToken cancellationToken) =>
        Pages.AnyAsync(x => x.Path == path && (excludeId == null || x.Id != excludeId), cancellationToken);

    public Task<bool> HasChildrenAsync(int id, CancellationToken cancellationToken) =>
        Pages.AnyAsync(x => x.ParentId == id, cancellationToken);

    public Task<Dictionary<int, int?>> GetParentMapAsync(CancellationToken cancellationToken) =>
        Pages.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.ParentId, cancellationToken);

    public void Add(Page page) => Pages.Add(page);

    public void Remove(Page page) => Pages.Remove(page);
}
