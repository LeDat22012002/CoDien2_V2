using Server.Modules.Identity.DTOs;
using Server.Shared.Models;

namespace Server.Modules.Identity.Services.Interfaces;

public interface IUserService
{
    Task<PagedResult<UserDto>> GetPagedAsync(UserFilterRequest filter, CancellationToken cancellationToken);

    Task<UserDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<IReadOnlyList<AvailableEmployeeDto>> GetAvailableEmployeesAsync(
        string? keyword, CancellationToken cancellationToken);

    Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken);

    Task<UserDto> UpdateAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken);

    Task ResetPasswordAsync(int id, ResetPasswordRequest request, CancellationToken cancellationToken);

    Task UnlockAsync(int id, CancellationToken cancellationToken);

    /// <summary>Xóa mềm tài khoản, thu hồi mọi phiên đăng nhập.</summary>
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
