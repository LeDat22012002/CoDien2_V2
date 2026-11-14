using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

public interface IWorkWeekRepository
{
    /// <summary>Không tracking, kèm hạn riêng các xưởng; tuần có ngày thứ 2 trong [fromMonday, toMonday].</summary>
    Task<IReadOnlyList<WorkWeek>> GetByStartDateRangeAsync(
        DateOnly fromMonday, DateOnly toMonday, CancellationToken cancellationToken);

    /// <summary>Không tracking, kèm hạn riêng các xưởng.</summary>
    Task<IReadOnlyList<WorkWeek>> GetByIsoYearAsync(int isoYear, CancellationToken cancellationToken);

    Task<WorkWeek?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking, kèm hạn riêng các xưởng; dùng khi sửa hạn.</summary>
    Task<WorkWeek?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking: tuần chưa chỉnh tay còn ít nhất 1 hạn sau thời điểm now (để tính lại khi đổi cấu hình).</summary>
    Task<IReadOnlyList<WorkWeek>> FindNotCustomizedWithFutureDeadlineAsync(
        DateTime now, CancellationToken cancellationToken);

    void Add(WorkWeek week);

    /// <summary>Bỏ theo dõi các tuần vừa thêm khi lưu bị trùng (tiến trình khác đã tạo cùng lúc).</summary>
    void Detach(IEnumerable<WorkWeek> weeks);

    void AddOverride(WorkWeekDeadlineOverride deadlineOverride);

    void RemoveOverride(WorkWeekDeadlineOverride deadlineOverride);
}