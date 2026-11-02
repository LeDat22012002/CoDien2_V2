using Server.Modules.Organization.Entities;

namespace Server.Modules.Organization.Repositories.Interfaces;

public interface IOrgChartHiddenEmployeeRepository
{
    /// <summary>Trong danh sách nhân viên truyền vào, những ai đang bị ẩn khỏi sơ đồ.</summary>
    Task<IReadOnlyList<int>> GetHiddenEmployeeIdsAsync(
        IReadOnlyCollection<int> employeeIds, CancellationToken cancellationToken);

    Task<OrgChartHiddenEmployee?> FindByEmployeeIdAsync(int employeeId, CancellationToken cancellationToken);

    void Add(OrgChartHiddenEmployee hiddenEmployee);

    void Remove(OrgChartHiddenEmployee hiddenEmployee);
}
