using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class WorkItemRepository(AppDbContext dbContext) : IWorkItemRepository
{
    private DbSet<WorkItem> Items => dbContext.Set<WorkItem>();

    private DbSet<WorkItemCodeCounter> Counters => dbContext.Set<WorkItemCodeCounter>();

    public async Task<IReadOnlyList<WorkItem>> GetByFormIdsAsync(
        IReadOnlyCollection<int> formIds, bool includeUnplanned, CancellationToken cancellationToken)
    {
        if (formIds.Count == 0)
        {
            return [];
        }

        var query = Items.AsNoTracking()
            .Include(x => x.Workers)
            .Where(x => formIds.Contains(x.WeeklyFormId));
        if (!includeUnplanned)
        {
            query = query.Where(x => !x.IsUnplanned);
        }

        return await query.AsSplitQuery().ToListAsync(cancellationToken);
    }

    public Task<WorkItem?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Items.AsNoTracking().Include(x => x.Workers).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<WorkItem?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Items.Include(x => x.Workers).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<int> GetMaxSortOrderAsync(int formId, CancellationToken cancellationToken) =>
        await Items.Where(x => x.WeeklyFormId == formId).MaxAsync(x => (int?)x.SortOrder, cancellationToken) ?? 0;

    public async Task<int> NextCodeSeqAsync(int formId, int categoryId, CancellationToken cancellationToken)
    {
        // Bộ đếm vừa thêm trong cùng lô (chưa lưu) thì dùng tiếp, không đọc lại DB
        var counter = Counters.Local.FirstOrDefault(x => x.WeeklyFormId == formId && x.WorkCategoryId == categoryId)
                      ?? await Counters
                          .FromSql($"""
                                    SELECT * FROM dbo.WorkItemCodeCounter WITH (UPDLOCK, HOLDLOCK)
                                    WHERE WeeklyFormId = {formId} AND WorkCategoryId = {categoryId}
                                    """)
                          .FirstOrDefaultAsync(cancellationToken);

        if (counter is null)
        {
            counter = new WorkItemCodeCounter { WeeklyFormId = formId, WorkCategoryId = categoryId, LastSeq = 0 };
            Counters.Add(counter);
        }

        counter.LastSeq++;
        return counter.LastSeq;
    }

    public void Add(WorkItem item) => Items.Add(item);

    public void Remove(WorkItem item) => Items.Remove(item);

    public void PrepareConcurrentUpdate(WorkItem item, byte[] clientRowVersion)
    {
        var entry = dbContext.Entry(item);
        entry.Property(x => x.RowVersion).OriginalValue = clientRowVersion;

        // Luôn ghi dòng cha (UpdatedAt đổi theo) để rowversion tăng khi chỉ sửa bảng con
        entry.Property(x => x.UpdatedAt).IsModified = true;
    }
}
