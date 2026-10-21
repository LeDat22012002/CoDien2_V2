using Server.Modules.Employees.Entities;
using Server.Modules.Incidents.DTOs;
using Server.Modules.Incidents.Entities;

namespace Server.Modules.Incidents.Repositories.Interfaces;

public interface IIncidentRepository
{
    /// <summary>reporterEmpCode khác null: chỉ lấy báo cáo do người đó nhập.</summary>
    Task<(IReadOnlyList<IncidentDto> Items, int TotalCount)> GetPagedAsync(
        IncidentFilterRequest filter, string? reporterEmpCode, CancellationToken cancellationToken);

    Task<IncidentDto?> GetDetailAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật / xóa.</summary>
    Task<Incident?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> HasByEquipmentCodeAsync(string equipmentCode, CancellationToken cancellationToken);

    Task<Employee?> GetEmployeeByEmpCodeAsync(string empCode, CancellationToken cancellationToken);

    void Add(Incident incident);

    void AddRange(IEnumerable<Incident> incidents);

    void Remove(Incident incident);
}
