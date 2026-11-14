using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class WorkWeekRepository(AppDbContext dbContext) : IWorkWeekRepository
{
    private DbSet<WorkWeek> Weeks => dbContext.Set<WorkWeek>();

    public async Task<IReadOnlyList<WorkWeek>> GetByStartDateRangeAsync(
        DateOnly fromMonday, DateOnly toMonday, CancellationToken cancellationToken) =>
        await Weeks.AsNoTracking()
            .Include(x => x.DeadlineOverrides)
            .Where(x => x.StartDate >= fromMonday && x.StartDate <= toMonday)
            .OrderBy(x => x.StartDate)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<WorkWeek>> GetByIsoYearAsync(int isoYear, CancellationToken cancellationToken) =>
        await Weeks.AsNoTracking()
            .Include(x => x.DeadlineOverrides)
            .Where(x => x.IsoYear == isoYear)
            .OrderBy(x => x.StartDate)
            .ToListAsync(cancellationToken);

    public Task<WorkWeek?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Weeks.AsNoTracking()
            .Include(x => x.DeadlineOverrides)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<WorkWeek?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Weeks
            .Include(x => x.DeadlineOverrides)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<WorkWeek>> FindNotCustomizedWithFutureDeadlineAsync(
        DateTime now, CancellationToken cancellationToken) =>
        await Weeks
            .Where(x => !x.IsDeadlineCustomized && (x.PlanDeadlineAt > now || x.ReportDeadlineAt > now))
            .ToListAsync(cancellationToken);

    public void Add(WorkWeek week) => Weeks.Add(week);

    public void Detach(IEnumerable<WorkWeek> weeks)
    {
        foreach (var week in weeks)
        {
            dbContext.Entry(week).State = EntityState.Detached;
        }
    }

    public void AddOverride(WorkWeekDeadlineOverride deadlineOverride) =>
        dbContext.Set<WorkWeekDeadlineOverride>().Add(deadlineOverride);

    public void RemoveOverride(WorkWeekDeadlineOverride deadlineOverride) =>
        dbContext.Set<WorkWeekDeadlineOverride>().Remove(deadlineOverride);
}