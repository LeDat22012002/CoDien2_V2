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

    public async Task<IReadOnlyList<WorkReportUnit>> GetAllIncludingDeletedAsync(CancellationToken cancellationToken) =>
        await Units.AsNoTracking().IgnoreQueryFilters()
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

    public Task<WorkReportUnit?> FindDeletedByIdAsync(int id, CancellationToken cancellationToken) =>
        Units.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id && x.IsDeleted, cancellationToken);

    public async Task<bool> HasDataAsync(int unitId, CancellationToken cancellationToken)
    {
        var formIds = dbContext.Set<WeeklyForm>().Where(f => f.WorkReportUnitId == unitId).Select(f => f.Id);
        return await dbContext.Set<WorkPlanItem>().AnyAsync(x => formIds.Contains(x.WeeklyFormId), cancellationToken)
               || await dbContext.Set<WorkReportItem>().AnyAsync(x => formIds.Contains(x.WeeklyFormId), cancellationToken)
               || await dbContext.Set<WorkPlanMaterial>().AnyAsync(x => formIds.Contains(x.WeeklyFormId), cancellationToken)
               || await dbContext.Set<WorkReportMaterial>().AnyAsync(x => formIds.Contains(x.WeeklyFormId), cancellationToken);
    }

    public async Task<IReadOnlyList<WeeklyForm>> FindFormsAsync(int unitId, CancellationToken cancellationToken) =>
        await dbContext.Set<WeeklyForm>().Where(x => x.WorkReportUnitId == unitId).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<WorkReportUnitEngineer>> FindAllEngineersAsync(
        int unitId, CancellationToken cancellationToken) =>
        await Engineers.Where(x => x.WorkReportUnitId == unitId).ToListAsync(cancellationToken);

    public void Add(WorkReportUnit unit) => Units.Add(unit);

    public void Remove(WorkReportUnit unit) => Units.Remove(unit);

    public void RemoveForm(WeeklyForm form) => dbContext.Set<WeeklyForm>().Remove(form);

    public void Detach(IEnumerable<WorkReportUnit> units)
    {
        foreach (var unit in units)
        {
            dbContext.Entry(unit).State = EntityState.Detached;
        }
    }

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