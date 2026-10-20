using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;

namespace Server.Modules.Organization.Repositories;

public class PositionLevelRepository(AppDbContext dbContext) : IPositionLevelRepository
{
    private DbSet<PositionLevel> PositionLevels => dbContext.Set<PositionLevel>();

    public async Task<IReadOnlyList<PositionLevel>> GetListAsync(CancellationToken cancellationToken) =>
        await PositionLevels.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Rank)
            .ToListAsync(cancellationToken);

    public Task<PositionLevel?> FindByCodeAsync(string code, CancellationToken cancellationToken) =>
        PositionLevels.FirstOrDefaultAsync(x => x.Code == code && x.IsActive, cancellationToken);
}
