using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;

namespace Server.Modules.Organization.Repositories;

public class OrgChartRepository(AppDbContext dbContext) : IOrgChartRepository
{
    public async Task<IReadOnlyList<VOrgUnit>> GetUnitsAsync(CancellationToken cancellationToken) =>
        await dbContext.Set<VOrgUnit>().AsNoTracking()
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<VUnitMember>> GetAllMembersAsync(CancellationToken cancellationToken) =>
        await dbContext.Set<VUnitMember>().AsNoTracking()
            .OrderBy(x => x.Rank).ThenBy(x => x.IsActing).ThenBy(x => x.FullName)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<VUnitMember>> GetMembersByUnitAsync(
        int orgUnitId, CancellationToken cancellationToken) =>
        await dbContext.Set<VUnitMember>().AsNoTracking()
            .Where(x => x.OrgUnitId == orgUnitId)
            .OrderBy(x => x.Rank).ThenBy(x => x.IsActing).ThenBy(x => x.FullName)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<PositionLevel>> GetPositionLevelsAsync(CancellationToken cancellationToken) =>
        await dbContext.Set<PositionLevel>().AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Rank)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<OrgUnitType>> GetUnitTypesAsync(CancellationToken cancellationToken) =>
        await dbContext.Set<OrgUnitType>().AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<OrgUnitTypeParent>> GetUnitTypeParentsAsync(CancellationToken cancellationToken) =>
        await dbContext.Set<OrgUnitTypeParent>().AsNoTracking().ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Discipline>> GetDisciplinesAsync(CancellationToken cancellationToken) =>
        await dbContext.Set<Discipline>().AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
}
