using Server.Modules.Employees.DTOs;
using Server.Modules.Employees.Entities;

namespace Server.Modules.Employees.Repositories.Interfaces;

public interface IEmployeeRepository
{
    /// <summary>employeeIds khác null: chỉ lấy trong danh sách này (lọc theo đơn vị).</summary>
    Task<(IReadOnlyList<Employee> Items, int TotalCount)> GetPagedAsync(
        EmployeeFilterRequest filter, IReadOnlyCollection<int>? employeeIds, CancellationToken cancellationToken);

    /// <summary>Đọc không tracking, dùng cho truy vấn chỉ đọc.</summary>
    Task<Employee?> GetByIdAsync(int id, CancellationToken cancellationToken);
    /// <summary>Đọc không tracking theo danh sách Id.</summary>
    Task<IReadOnlyList<Employee>> GetByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken cancellationToken);
    
    /// <summary>Đọc không tracking theo mã nhân viên.</summary>
    Task<Employee?> GetByEmpCodeAsync(string empCode, CancellationToken cancellationToken);

    /// <summary>Đọc có tracking, dùng khi cần cập nhật hoặc xóa.</summary>
    Task<Employee?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Như FindByIdAsync nhưng tìm theo mã nhân viên (tên đăng nhập).</summary>
    Task<Employee?> FindByEmpCodeAsync(string empCode, CancellationToken cancellationToken);

    Task<bool> IsEmpCodeTakenAsync(string empCode, int? excludeId, CancellationToken cancellationToken);

    Task<bool> HasAssignmentsAsync(int employeeId, CancellationToken cancellationToken);

    void Add(Employee employee);

    void Remove(Employee employee);
}
