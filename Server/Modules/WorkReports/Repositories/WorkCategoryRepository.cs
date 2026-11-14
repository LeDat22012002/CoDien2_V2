using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class WorkCategoryRepository(AppDbContext dbContext) : IWorkCategoryRepository
{
    private DbSet<WorkCategory> Categories => dbContext.Set<WorkCategory>();

    public async Task<IReadOnlyList<WorkCategory>> GetListAsync(
        bool includeInactive, CancellationToken cancellationToken) =>
        await Categories.AsNoTracking()
            .Include(x => x.Workshops)
            .Where(x => includeInactive || x.IsActive)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

    public Task<WorkCategory?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Categories.AsNoTracking()
            .Include(x => x.Workshops)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<WorkCategory?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Categories
            .Include(x => x.Workshops)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> IsCodeTakenAsync(string code, int? exceptId, CancellationToken cancellationToken) =>
        Categories.AnyAsync(x => x.Code == code && (exceptId == null || x.Id != exceptId), cancellationToken);

    public Task<bool> IsCodeSuffixTakenAsync(string codeSuffix, int? exceptId, CancellationToken cancellationToken) =>
        Categories.AnyAsync(
            x => x.CodeSuffix == codeSuffix && (exceptId == null || x.Id != exceptId), cancellationToken);

    public async Task<int> GetMaxSortOrderAsync(CancellationToken cancellationToken) =>
        await Categories.MaxAsync(x => (int?)x.SortOrder, cancellationToken) ?? 0;

    public void Add(WorkCategory category) => Categories.Add(category);

    public void RemoveWorkshop(WorkCategoryWorkshop workshop) => dbContext.Set<WorkCategoryWorkshop>().Remove(workshop);
}