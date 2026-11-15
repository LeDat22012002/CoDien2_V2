using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

public interface IWeeklyFormRepository
{
    /// <summary>Không tracking, kèm đơn vị báo cáo: form của 1 tuần thuộc xưởng (theo WorkshopId đã chụp).</summary>
    Task<IReadOnlyList<WeeklyForm>> GetByWeekAndWorkshopAsync(
        int weekId, int workshopId, CancellationToken cancellationToken);

    /// <summary>Không tracking, kèm đơn vị báo cáo và kỳ tuần (gồm hạn riêng các xưởng).</summary>
    Task<WeeklyForm?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking: form của các tuần (lọc đơn vị nếu có); dùng khi tạo form thiếu / cập nhật thông tin chụp.</summary>
    Task<IReadOnlyList<WeeklyForm>> FindByWeeksAsync(
        IReadOnlyCollection<int> weekIds, IReadOnlyCollection<int>? unitIds, CancellationToken cancellationToken);

    /// <summary>Id các form đã cấp ít nhất 1 mã công việc.</summary>
    Task<IReadOnlyList<int>> GetFormIdsWithCodesAsync(IReadOnlyCollection<int> formIds, CancellationToken cancellationToken);

    /// <summary>Id các form có ít nhất 1 dòng công việc (chưa xóa).</summary>
    Task<IReadOnlyList<int>> GetFormIdsWithItemsAsync(IReadOnlyCollection<int> formIds, CancellationToken cancellationToken);

    void Add(WeeklyForm form);

    void Remove(WeeklyForm form);

    /// <summary>Bỏ theo dõi các form vừa thêm khi lưu bị trùng (tiến trình khác đã tạo cùng lúc).</summary>
    void Detach(IEnumerable<WeeklyForm> forms);
}
