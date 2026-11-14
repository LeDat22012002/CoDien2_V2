using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

public interface IWorkCategoryRepository
{
    /// <summary>Không tracking, kèm danh sách xưởng áp dụng, sắp theo SortOrder.</summary>
    Task<IReadOnlyList<WorkCategory>> GetListAsync(bool includeInactive, CancellationToken cancellationToken);

    /// <summary>Không tracking, kèm danh sách xưởng.</summary>
    Task<WorkCategory?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking, kèm danh sách xưởng; dùng khi cập nhật.</summary>
    Task<WorkCategory?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> IsCodeTakenAsync(string code, int? exceptId, CancellationToken cancellationToken);

    Task<bool> IsCodeSuffixTakenAsync(string codeSuffix, int? exceptId, CancellationToken cancellationToken);

    Task<int> GetMaxSortOrderAsync(CancellationToken cancellationToken);

    void Add(WorkCategory category);

    void RemoveWorkshop(WorkCategoryWorkshop workshop);
}