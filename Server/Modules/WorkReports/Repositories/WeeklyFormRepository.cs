using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class WeeklyFormRepository(AppDbContext dbContext) : IWeeklyFormRepository
{
    private DbSet<WeeklyForm> Forms => dbContext.Set<WeeklyForm>();

    // Form của tuần đã khóa vẫn hiện dù đơn vị đã xóa sau đó (form là bản chụp của tuần): bỏ bộ lọc xóa mềm
    // để Include không loại form theo đơn vị, rồi tự lọc form / hạn riêng chưa xóa.

    public async Task<IReadOnlyList<WeeklyForm>> GetByWeekAndWorkshopAsync(
        int weekId, int workshopId, CancellationToken cancellationToken) =>
        await Forms.AsNoTracking().IgnoreQueryFilters()
            .Include(x => x.WorkReportUnit)
            .Where(x => !x.IsDeleted && x.WorkWeekId == weekId && x.WorkshopId == workshopId)
            .ToListAsync(cancellationToken);

    public Task<WeeklyForm?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Forms.AsNoTracking().IgnoreQueryFilters()
            .Include(x => x.WorkReportUnit)
            .Include(x => x.WorkWeek).ThenInclude(x => x.DeadlineOverrides.Where(o => !o.IsDeleted))
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted && !x.WorkWeek.IsDeleted, cancellationToken);

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
        await dbContext.Set<WorkPlanItem>()
            .Where(x => formIds.Contains(x.WeeklyFormId))
            .Select(x => x.WeeklyFormId)
            .Union(dbContext.Set<WorkReportItem>()
                .Where(x => formIds.Contains(x.WeeklyFormId))
                .Select(x => x.WeeklyFormId))
            .ToListAsync(cancellationToken);

    public async Task<int> NextCodeSeqAsync(int formId, int categoryId, CancellationToken cancellationToken)
    {
        var counters = dbContext.Set<WorkItemCodeCounter>();

        // Bộ đếm vừa thêm trong cùng lô (chưa lưu) thì dùng tiếp, không đọc lại DB
        var counter = counters.Local.FirstOrDefault(x => x.WeeklyFormId == formId && x.WorkCategoryId == categoryId)
                      ?? await counters
                          .FromSql($"""
                                    SELECT * FROM dbo.WorkItemCodeCounter WITH (UPDLOCK, HOLDLOCK)
                                    WHERE WeeklyFormId = {formId} AND WorkCategoryId = {categoryId}
                                    """)
                          .FirstOrDefaultAsync(cancellationToken);

        if (counter is null)
        {
            counter = new WorkItemCodeCounter { WeeklyFormId = formId, WorkCategoryId = categoryId, LastSeq = 0 };
            counters.Add(counter);
        }

        counter.LastSeq++;
        return counter.LastSeq;
    }

    public Task<WeeklyForm?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Forms.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

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