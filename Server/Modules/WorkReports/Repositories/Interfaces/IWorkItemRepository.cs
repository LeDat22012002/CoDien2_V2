using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

/// <summary>Dòng kế hoạch (<see cref="WorkPlanItem"/>) hoặc dòng báo cáo (<see cref="WorkReportItem"/>), kèm người thực hiện.</summary>
public interface IWorkItemRepository<TItem> where TItem : class
{
    /// <summary>Không tracking.</summary>
    Task<IReadOnlyList<TItem>> GetByFormIdsAsync(IReadOnlyCollection<int> formIds, CancellationToken cancellationToken);

    /// <summary>Không tracking.</summary>
    Task<IReadOnlyList<TItem>> GetByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken cancellationToken);

    /// <summary>Không tracking.</summary>
    Task<TItem?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking.</summary>
    Task<TItem?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<int> GetMaxSortOrderAsync(int formId, CancellationToken cancellationToken);

    void Add(TItem item);

    void Remove(TItem item);

    /// <summary>Gắn rowVersion client gửi lên làm giá trị gốc để EF phát hiện người khác đã sửa (409).</summary>
    void PrepareConcurrentUpdate(TItem item, byte[] clientRowVersion);
}

public interface IWorkPlanItemRepository : IWorkItemRepository<WorkPlanItem>;

public interface IWorkReportItemRepository : IWorkItemRepository<WorkReportItem>
{
    /// <summary>Id dòng kế hoạch đã có dòng báo cáo (chưa xóa) trong form.</summary>
    Task<IReadOnlySet<int>> GetAcceptedPlanItemIdsAsync(int formId, CancellationToken cancellationToken);
}
