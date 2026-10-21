using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;

namespace Server.Modules.Organization.Repositories;

public class OrgUnitRepository(AppDbContext dbContext) : IOrgUnitRepository
{
    private DbSet<OrgUnit> OrgUnits => dbContext.Set<OrgUnit>();

    public async Task<IReadOnlyList<OrgUnit>> GetListAsync(
        OrgUnitFilterRequest filter, CancellationToken cancellationToken)
    {
        var query = OrgUnits.AsNoTracking();

        if (!filter.IncludeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        if (filter.ParentId is { } parentId)
        {
            query = query.Where(x => x.ParentId == parentId);
        }

        if (!string.IsNullOrWhiteSpace(filter.TypeCode))
        {
            query = query.Where(x => x.TypeCode == filter.TypeCode);
        }

        return await query.OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
    }

    public Task<OrgUnit?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        OrgUnits.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<OrgUnit>> GetTopLevelUnitsAsync(
        bool includeInactive, CancellationToken cancellationToken) =>
        await OrgUnits.AsNoTracking()
            .Where(x => x.Parent != null && x.Parent.ParentId == null && (includeInactive || x.IsActive))
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

    public Task<OrgUnit?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        OrgUnits.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> IsCodeTakenAsync(string code, CancellationToken cancellationToken) =>
        OrgUnits.AnyAsync(x => x.Code == code, cancellationToken);

    public Task<bool> IsTypeExistingAsync(string typeCode, CancellationToken cancellationToken) =>
        dbContext.Set<OrgUnitType>().AnyAsync(x => x.Code == typeCode, cancellationToken);

    public Task<bool> IsLevelActiveAsync(string levelCode, CancellationToken cancellationToken) =>
        dbContext.Set<PositionLevel>().AnyAsync(x => x.Code == levelCode && x.IsActive, cancellationToken);

    public Task<bool> IsDisciplineActiveAsync(string disciplineCode, CancellationToken cancellationToken) =>
        dbContext.Set<Discipline>().AnyAsync(x => x.Code == disciplineCode && x.IsActive, cancellationToken);

    public async Task<IReadOnlyList<string>> GetAllowedParentTypesAsync(
        string childTypeCode, CancellationToken cancellationToken) =>
        await dbContext.Set<OrgUnitTypeParent>().AsNoTracking()
            .Where(x => x.ChildTypeCode == childTypeCode)
            .Select(x => x.ParentTypeCode)
            .ToListAsync(cancellationToken);

    public Task<int?> GetParentIdAsync(int id, CancellationToken cancellationToken) =>
        OrgUnits.Where(x => x.Id == id).Select(x => x.ParentId).FirstOrDefaultAsync(cancellationToken);

    public Task<bool> HasActiveChildrenAsync(int id, CancellationToken cancellationToken) =>
        OrgUnits.AnyAsync(x => x.ParentId == id && x.IsActive, cancellationToken);

    public Task<bool> HasActiveMembersAsync(int id, CancellationToken cancellationToken) =>
        dbContext.Set<EmployeeAssignment>().AnyAsync(x => x.OrgUnitId == id && x.EndDate == null, cancellationToken);

    public async Task<IReadOnlyList<OrgUnit>> GetActiveChildrenAsync(int parentId, CancellationToken cancellationToken) =>
        await OrgUnits.Where(x => x.ParentId == parentId && x.IsActive).ToListAsync(cancellationToken);

    public void Add(OrgUnit orgUnit) => OrgUnits.Add(orgUnit);
}
