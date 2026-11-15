using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

public interface IWorkItemRepository
{
    /// <summary>Không tracking, kèm người thực hiện: dòng của các form (bỏ dòng phát sinh nếu includeUnplanned = false).</summary>
    Task<IReadOnlyList<WorkItem>> GetByFormIdsAsync(
        IReadOnlyCollection<int> formIds, bool includeUnplanned, CancellationToken cancellationToken);

    /// <summary>Không tracking, kèm người thực hiện.</summary>
    Task<WorkItem?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking, kèm người thực hiện; dùng khi sửa / xóa.</summary>
    Task<WorkItem?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<int> GetMaxSortOrderAsync(int formId, CancellationToken cancellationToken);

    /// <summary>
    /// Cấp STT tiếp theo cho (form, đầu mục): đọc bộ đếm bằng UPDLOCK, HOLDLOCK rồi tăng.
    /// Phải gọi trong IUnitOfWork.ExecuteInTransactionAsync; bộ đếm được lưu cùng lần SaveChanges.
    /// </summary>
    Task<int> NextCodeSeqAsync(int formId, int categoryId, CancellationToken cancellationToken);

    void Add(WorkItem item);

    /// <summary>Xóa mềm.</summary>
    void Remove(WorkItem item);

    /// <summary>
    /// Đánh dấu dòng đã sửa (để rowversion luôn tăng, kể cả khi chỉ đổi người thực hiện)
    /// và so rowversion client gửi lên khi lưu: lệch → DbUpdateConcurrencyException.
    /// </summary>
    void PrepareConcurrentUpdate(WorkItem item, byte[] clientRowVersion);
}
