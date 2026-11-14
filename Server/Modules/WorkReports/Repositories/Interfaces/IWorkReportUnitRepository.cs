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

    Task<bool> IsOrgUnitConfiguredAsync(int orgUnitId, CancellationToken cancellationToken);

    void Add(WorkReportUnit unit);

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