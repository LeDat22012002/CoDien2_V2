using Server.Modules.Employees.Entities;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Repositories.Interfaces;

public interface IUserRepository
{
    Task<(IReadOnlyList<UserDto> Items, int TotalCount)> GetPagedAsync(
        UserFilterRequest filter, CancellationToken cancellationToken);

    Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking, kèm Employee và UserRoles; dùng khi cập nhật.</summary>
    Task<User?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking, kèm Employee; dùng khi đăng nhập.</summary>
    Task<User?> FindByEmpCodeAsync(string empCode, CancellationToken cancellationToken);

    /// <summary>Đọc bảng Employee (chỉ đọc) để kiểm tra khi tạo tài khoản.</summary>
    Task<Employee?> GetEmployeeAsync(int employeeId, CancellationToken cancellationToken);

    Task<bool> HasAccountAsync(int employeeId, CancellationToken cancellationToken);

    Task<IReadOnlyList<AvailableEmployeeDto>> GetAvailableEmployeesAsync(
        string? keyword, CancellationToken cancellationToken);

    /// <summary>Số tài khoản đang hoạt động có role chỉ định (bỏ qua excludeUserId).</summary>
    Task<int> CountActiveUsersInRoleAsync(int roleId, int? excludeUserId, CancellationToken cancellationToken);

    void Add(User user);
}
