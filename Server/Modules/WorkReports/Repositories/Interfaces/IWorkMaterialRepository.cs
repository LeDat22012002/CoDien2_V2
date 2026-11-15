using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

public interface IWorkMaterialRepository
{
    /// <summary>Không tracking, kèm dòng công việc và mục đích: vật tư của các form (bỏ vật tư phát sinh nếu includeUnplanned = false).</summary>
    Task<IReadOnlyList<WorkMaterial>> GetByFormIdsAsync(
        IReadOnlyCollection<int> formIds, bool includeUnplanned, CancellationToken cancellationToken);

    /// <summary>Không tracking, kèm dòng công việc và mục đích.</summary>
    Task<WorkMaterial?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking.</summary>
    Task<WorkMaterial?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking: vật tư của 1 dòng công việc (xóa theo dòng).</summary>
    Task<IReadOnlyList<WorkMaterial>> FindByWorkItemIdAsync(int workItemId, CancellationToken cancellationToken);

    void Add(WorkMaterial material);

    /// <summary>Xóa mềm.</summary>
    void Remove(WorkMaterial material);
}
