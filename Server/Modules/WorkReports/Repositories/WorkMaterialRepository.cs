using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class WorkMaterialRepository(AppDbContext dbContext) : IWorkMaterialRepository
{
    private DbSet<WorkMaterial> Materials => dbContext.Set<WorkMaterial>();

    public async Task<IReadOnlyList<WorkMaterial>> GetByFormIdsAsync(
        IReadOnlyCollection<int> formIds, bool includeUnplanned, CancellationToken cancellationToken)
    {
        if (formIds.Count == 0)
        {
            return [];
        }

        var query = Materials.AsNoTracking()
            .Include(x => x.WorkItem)
            .Include(x => x.MaterialPurpose)
            .Where(x => formIds.Contains(x.WeeklyFormId));
        if (!includeUnplanned)
        {
            // Kế hoạch: bỏ vật tư phát sinh và vật tư của dòng phát sinh
            query = query.Where(x => !x.IsUnplanned && !x.WorkItem.IsUnplanned);
        }

        return await query.OrderBy(x => x.WorkItem.Code).ThenBy(x => x.Id).ToListAsync(cancellationToken);
    }

    public Task<WorkMaterial?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Materials.AsNoTracking()
            .Include(x => x.WorkItem)
            .Include(x => x.MaterialPurpose)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<WorkMaterial?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Materials.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<WorkMaterial>> FindByWorkItemIdAsync(int workItemId, CancellationToken cancellationToken) =>
        await Materials.Where(x => x.WorkItemId == workItemId).ToListAsync(cancellationToken);

    public void Add(WorkMaterial material) => Materials.Add(material);

    public void Remove(WorkMaterial material) => Materials.Remove(material);
}
