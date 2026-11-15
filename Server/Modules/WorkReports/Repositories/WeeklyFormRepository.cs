using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class WeeklyFormRepository(AppDbContext dbContext) : IWeeklyFormRepository
{
    private DbSet<WeeklyForm> Forms => dbContext.Set<WeeklyForm>();

    public async Task<IReadOnlyList<WeeklyForm>> GetByWeekAndWorkshopAsync(
        int weekId, int workshopId, CancellationToken cancellationToken) =>
        await Forms.AsNoTracking()
            .Include(x => x.WorkReportUnit)
            .Where(x => x.WorkWeekId == weekId && x.WorkshopId == workshopId)
            .ToListAsync(cancellationToken);

    public Task<WeeklyForm?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Forms.AsNoTracking()
            .Include(x => x.WorkReportUnit)
            .Include(x => x.WorkWeek).ThenInclude(x => x.DeadlineOverrides)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<WeeklyForm>> FindByWeeksAsync(
        IReadOnlyCollection<int> weekIds, IReadOnlyCollection<int>? unitIds, CancellationToken cancellationToken)
    {
        var query = Forms.Where(x => weekIds.Contains(x.WorkWeekId));
        if (unitIds is not null)
        {
            query = query.Where(x => unitIds.Contains(x.WorkReportUnitId));
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<int>> GetFormIdsWithCodesAsync(
        IReadOnlyCollection<int> formIds, CancellationToken cancellationToken) =>
        await dbContext.Set<WorkItemCodeCounter>()
            .Where(x => formIds.Contains(x.WeeklyFormId))
            .Select(x => x.WeeklyFormId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<int>> GetFormIdsWithItemsAsync(
        IReadOnlyCollection<int> formIds, CancellationToken cancellationToken) =>
        await dbContext.Set<WorkItem>()
            .Where(x => formIds.Contains(x.WeeklyFormId))
            .Select(x => x.WeeklyFormId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public void Add(WeeklyForm form) => Forms.Add(form);

    public void Remove(WeeklyForm form) => Forms.Remove(form);

    public void Detach(IEnumerable<WeeklyForm> forms)
    {
        foreach (var form in forms)
        {
            dbContext.Entry(form).State = EntityState.Detached;
        }
    }
}
