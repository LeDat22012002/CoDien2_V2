using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

public interface IWorkReportUnitRepository
{
    /// <summary>Không tracking, mọi đơn vị (lọc theo xưởng ở Service vì xưởng tính từ cây tổ chức).</summary>
    Task<IReadOnlyList<WorkReportUnit>> GetListAsync(bool includeInactive, CancellationToken cancellationToken);

    Task<WorkReportUnit?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật / sắp xếp.</summary>
    Task<WorkReportUnit?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi sắp xếp lại.</summary>
    Task<IReadOnlyList<WorkReportUnit>> FindByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken cancellationToken);

    /// <summary>Không tracking, mọi đơn vị kể cả đã xóa (đồng bộ theo sơ đồ: tổ/kíp đã xóa thì không tạo lại).</summary>
    Task<IReadOnlyList<WorkReportUnit>> GetAllIncludingDeletedAsync(CancellationToken cancellationToken);

    /// <summary>Có tracking: đơn vị đã xóa, dùng khi khôi phục.</summary>
    Task<WorkReportUnit?> FindDeletedByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Đơn vị đã có dòng công việc hoặc vật tư ở bất kỳ tuần nào.</summary>
    Task<bool> HasDataAsync(int unitId, CancellationToken cancellationToken);

    /// <summary>Có tracking: mọi form của đơn vị (xóa đơn vị chưa có dữ liệu thì bỏ form trống).</summary>
    Task<IReadOnlyList<WeeklyForm>> FindFormsAsync(int unitId, CancellationToken cancellationToken);

    /// <summary>Có tracking: mọi dòng phân công kỹ sư của đơn vị (cả đã kết thúc).</summary>
    Task<IReadOnlyList<WorkReportUnitEngineer>> FindAllEngineersAsync(int unitId, CancellationToken cancellationToken);

    void Add(WorkReportUnit unit);

    void Remove(WorkReportUnit unit);

    void RemoveForm(WeeklyForm form);

    /// <summary>Bỏ theo dõi đơn vị vừa thêm khi lưu bị trùng (tiến trình khác đã tạo cùng lúc).</summary>
    void Detach(IEnumerable<WorkReportUnit> units);

    // ===== Kỹ sư phụ trách =====

    /// <summary>Không tracking: kỹ sư đang phụ trách (hiệu lực vào ngày today) của các đơn vị; null = mọi đơn vị.</summary>
    Task<IReadOnlyList<WorkReportUnitEngineer>> GetActiveEngineersAsync(
        IReadOnlyCollection<int>? unitIds, DateOnly today, CancellationToken cancellationToken);

    /// <summary>Có tracking: kỹ sư đang phụ trách 1 đơn vị; dùng khi lưu danh sách mới.</summary>
    Task<IReadOnlyList<WorkReportUnitEngineer>> FindActiveEngineersAsync(
        int unitId, DateOnly today, CancellationToken cancellationToken);

    /// <summary>Id đơn vị (đang dùng) mà nhân viên đang phụ trách.</summary>
    Task<IReadOnlyList<int>> GetUnitIdsOfEngineerAsync(
        int employeeId, DateOnly today, CancellationToken cancellationToken);

    void AddEngineer(WorkReportUnitEngineer engineer);

    void RemoveEngineer(WorkReportUnitEngineer engineer);
}