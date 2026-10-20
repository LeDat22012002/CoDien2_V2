using Server.Modules.Employees.DTOs;
using Server.Modules.Employees.Entities;

namespace Server.Modules.Employees.Repositories.Interfaces;

public interface IEmployeeRepository
{
    Task<(IReadOnlyList<Employee> Items, int TotalCount)> GetPagedAsync(
        EmployeeFilterRequest filter, CancellationToken cancellationToken);

    /// <summary>Đọc không tracking, dùng cho truy vấn chỉ đọc.</summary>
    Task<Employee?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Đọc có tracking, dùng khi cần cập nhật hoặc xóa.</summary>
    Task<Employee?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> IsEmpCodeTakenAsync(string empCode, int? excludeId, CancellationToken cancellationToken);

    Task<bool> HasAssignmentsAsync(int employeeId, CancellationToken cancellationToken);

    void Add(Employee employee);

    void Remove(Employee employee);
}
