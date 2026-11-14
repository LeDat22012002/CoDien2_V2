using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class MaterialPurposeRepository(AppDbContext dbContext) : IMaterialPurposeRepository
{
    private DbSet<MaterialPurpose> Purposes => dbContext.Set<MaterialPurpose>();

    public async Task<IReadOnlyList<MaterialPurpose>> GetListAsync(
        bool includeInactive, CancellationToken cancellationToken) =>
        await Purposes.AsNoTracking()
            .Where(x => includeInactive || x.IsActive)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

    public Task<MaterialPurpose?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Purposes.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> IsCodeTakenAsync(string code, int? exceptId, CancellationToken cancellationToken) =>
        Purposes.AnyAsync(x => x.Code == code && (exceptId == null || x.Id != exceptId), cancellationToken);

    public async Task<int> GetMaxSortOrderAsync(CancellationToken cancellationToken) =>
        await Purposes.MaxAsync(x => (int?)x.SortOrder, cancellationToken) ?? 0;

    public void Add(MaterialPurpose purpose) => Purposes.Add(purpose);
}