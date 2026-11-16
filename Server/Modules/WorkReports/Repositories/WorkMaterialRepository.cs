using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

/// <summary>Truy vấn chung cho vật tư kế hoạch / báo cáo; itemIdProperty = tên cột khóa ngoại tới dòng.</summary>
public abstract class WorkMaterialRepository<TMaterial>(AppDbContext dbContext, string itemIdProperty)
    : IWorkMaterialRepository<TMaterial>
    where TMaterial : WorkMaterialBase
{
    private DbSet<TMaterial> Materials => dbContext.Set<TMaterial>();

    public async Task<IReadOnlyList<TMaterial>> GetByFormIdsAsync(
        IReadOnlyCollection<int> formIds, CancellationToken cancellationToken)
    {
        if (formIds.Count == 0)
        {
            return [];
        }

        return await Materials.AsNoTracking()
            .Include(x => x.MaterialPurpose)
            .Where(x => formIds.Contains(x.WeeklyFormId))
            .OrderBy(x => x.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<TMaterial?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Materials.AsNoTracking()
            .Include(x => x.MaterialPurpose)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<TMaterial?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Materials.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<TMaterial>> FindByItemIdsAsync(
        IReadOnlyCollection<int> itemIds, CancellationToken cancellationToken)
    {
        if (itemIds.Count == 0)
        {
            return [];
        }

        return await Materials
            .Where(x => itemIds.Contains(EF.Property<int>(x, itemIdProperty)))
            .ToListAsync(cancellationToken);
    }

    public void Add(TMaterial material) => Materials.Add(material);

    public void Remove(TMaterial material) => Materials.Remove(material);
}

public class WorkPlanMaterialRepository(AppDbContext dbContext)
    : WorkMaterialRepository<WorkPlanMaterial>(dbContext, nameof(WorkPlanMaterial.WorkPlanItemId)),
        IWorkPlanMaterialRepository;

public class WorkReportMaterialRepository(AppDbContext dbContext)
    : WorkMaterialRepository<WorkReportMaterial>(dbContext, nameof(WorkReportMaterial.WorkReportItemId)),
        IWorkReportMaterialRepository;
