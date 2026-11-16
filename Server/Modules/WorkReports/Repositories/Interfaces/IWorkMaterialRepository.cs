using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

/// <summary>Vật tư kế hoạch (<see cref="WorkPlanMaterial"/>) hoặc báo cáo (<see cref="WorkReportMaterial"/>).</summary>
public interface IWorkMaterialRepository<TMaterial> where TMaterial : WorkMaterialBase
{
    /// <summary>Không tracking, kèm mục đích.</summary>
    Task<IReadOnlyList<TMaterial>> GetByFormIdsAsync(IReadOnlyCollection<int> formIds, CancellationToken cancellationToken);

    /// <summary>Không tracking, kèm mục đích.</summary>
    Task<TMaterial?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking.</summary>
    Task<TMaterial?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking: vật tư của các dòng.</summary>
    Task<IReadOnlyList<TMaterial>> FindByItemIdsAsync(IReadOnlyCollection<int> itemIds, CancellationToken cancellationToken);

    void Add(TMaterial material);

    void Remove(TMaterial material);
}

public interface IWorkPlanMaterialRepository : IWorkMaterialRepository<WorkPlanMaterial>;

public interface IWorkReportMaterialRepository : IWorkMaterialRepository<WorkReportMaterial>;
