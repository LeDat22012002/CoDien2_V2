using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

/// <summary>Truy vấn chung cho dòng kế hoạch / báo cáo (mỗi loại 1 bảng).</summary>
public abstract class WorkItemRepository<TItem, TWorker>(AppDbContext dbContext) : IWorkItemRepository<TItem>
    where TItem : WorkItemBase<TWorker>
    where TWorker : WorkItemWorkerBase
{
    protected DbSet<TItem> Items => dbContext.Set<TItem>();

    public async Task<IReadOnlyList<TItem>> GetByFormIdsAsync(
        IReadOnlyCollection<int> formIds, CancellationToken cancellationToken)
    {
        if (formIds.Count == 0)
        {
            return [];
        }

        return await Items.AsNoTracking()
            .Include(x => x.Workers)
            .Where(x => formIds.Contains(x.WeeklyFormId))
            .AsSplitQuery()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TItem>> GetByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        return await Items.AsNoTracking()
            .Include(x => x.Workers)
            .Where(x => ids.Contains(x.Id))
            .AsSplitQuery()
            .ToListAsync(cancellationToken);
    }

    public Task<TItem?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Items.AsNoTracking().Include(x => x.Workers).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<TItem?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Items.Include(x => x.Workers).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<int> GetMaxSortOrderAsync(int formId, CancellationToken cancellationToken) =>
        await Items.Where(x => x.WeeklyFormId == formId).MaxAsync(x => (int?)x.SortOrder, cancellationToken) ?? 0;

    public void Add(TItem item) => Items.Add(item);

    /// <summary>
    /// Xóa mềm bằng cờ, không gọi Items.Remove: dòng có cột JSON (KTV phụ trách, Cả tổ) lưu dạng phần tử sở hữu;
    /// Remove đánh dấu cả các phần tử JSON là xóa, rồi khi SaveChanges đổi dòng sang xóa mềm (sửa) EF phải ghi lại
    /// cột JSON từ phần tử đang bị xóa và báo lỗi "WorkItemEngineer.Id is part of a key". Mã công việc đã cấp vẫn
    /// không dùng lại (dòng còn trong bảng). Người thực hiện giữ nguyên theo dòng đã xóa (bị lọc cùng dòng).
    /// </summary>
    public void Remove(TItem item) => item.IsDeleted = true;

    public void PrepareConcurrentUpdate(TItem item, byte[] clientRowVersion)
    {
        var entry = dbContext.Entry(item);
        entry.Property(x => x.RowVersion).OriginalValue = clientRowVersion;

        // Luôn ghi dòng cha (UpdatedAt đổi theo) để rowversion tăng khi chỉ sửa bảng con
        entry.Property(x => x.UpdatedAt).IsModified = true;
    }
}

public class WorkPlanItemRepository(AppDbContext dbContext)
    : WorkItemRepository<WorkPlanItem, WorkPlanItemWorker>(dbContext), IWorkPlanItemRepository;

public class WorkReportItemRepository(AppDbContext dbContext)
    : WorkItemRepository<WorkReportItem, WorkReportItemWorker>(dbContext), IWorkReportItemRepository
{
    public async Task<IReadOnlySet<int>> GetAcceptedPlanItemIdsAsync(int formId, CancellationToken cancellationToken) =>
        (await Items.Where(x => x.WeeklyFormId == formId && x.PlanItemId != null)
            .Select(x => x.PlanItemId!.Value)
            .ToListAsync(cancellationToken))
        .ToHashSet();
}