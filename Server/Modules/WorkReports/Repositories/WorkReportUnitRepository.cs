using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class WorkReportUnitRepository(AppDbContext dbContext) : IWorkReportUnitRepository
{
    private DbSet<WorkReportUnit> Units => dbContext.Set<WorkReportUnit>();

    private DbSet<WorkReportUnitEngineer> Engineers => dbContext.Set<WorkReportUnitEngineer>();

    public async Task<IReadOnlyList<WorkReportUnit>> GetListAsync(
        bool includeInactive, CancellationToken cancellationToken) =>
        await Units.AsNoTracking()
            .Where(x => includeInactive || x.IsActive)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

    public Task<WorkReportUnit?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Units.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<WorkReportUnit?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Units.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<WorkReportUnit>> FindByIdsAsync(
        IReadOnlyCollection<int> ids, CancellationToken cancellationToken) =>
        await Units.Where(x => ids.Contains(x.Id)).ToListAsync(cancellationToken);

    public Task<bool> IsOrgUnitConfiguredAsync(int orgUnitId, CancellationToken cancellationToken) =>
        Units.AnyAsync(x => x.OrgUnitId == orgUnitId, cancellationToken);

    public void Add(WorkReportUnit unit) => Units.Add(unit);

    // ===== Kỹ sư phụ trách =====

    public async Task<IReadOnlyList<WorkReportUnitEngineer>> GetActiveEngineersAsync(
        IReadOnlyCollection<int>? unitIds, DateOnly today, CancellationToken cancellationToken)
    {
        var query = ActiveOn(Engineers.AsNoTracking(), today);
        if (unitIds is not null)
        {
            query = query.Where(x => unitIds.Contains(x.WorkReportUnitId));
        }

        return await query.OrderBy(x => x.StartDate).ThenBy(x => x.Id).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<WorkReportUnitEngineer>> FindActiveEngineersAsync(
        int unitId, DateOnly today, CancellationToken cancellationToken) =>
        await ActiveOn(Engineers, today)
            .Where(x => x.WorkReportUnitId == unitId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<int>> GetUnitIdsOfEngineerAsync(
        int employeeId, DateOnly today, CancellationToken cancellationToken) =>
        await ActiveOn(Engineers.AsNoTracking(), today)
            .Where(x => x.EmployeeId == employeeId && x.WorkReportUnit.IsActive)
            .Select(x => x.WorkReportUnitId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public void AddEngineer(WorkReportUnitEngineer engineer) => Engineers.Add(engineer);

    public void RemoveEngineer(WorkReportUnitEngineer engineer) => Engineers.Remove(engineer);

    private static IQueryable<WorkReportUnitEngineer> ActiveOn(IQueryable<WorkReportUnitEngineer> query, DateOnly today) =>
        query.Where(x => x.StartDate <= today && (x.EndDate == null || x.EndDate >= today));
}