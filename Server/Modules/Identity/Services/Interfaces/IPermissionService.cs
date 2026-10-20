using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Services.Interfaces;

public interface IPermissionService
{
    Task<IReadOnlyList<PermissionGroupDto>> GetGroupedAsync(CancellationToken cancellationToken);

    Task<PermissionDto> UpdateAsync(int id, UpdatePermissionRequest request, CancellationToken cancellationToken);

    /// <summary>Trạng thái phân quyền của user (có cache); null nếu user không tồn tại.</summary>
    Task<UserAuthState?> GetAuthStateAsync(int userId, CancellationToken cancellationToken);

    /// <summary>Trạng thái của người đang gọi API; chưa đăng nhập → UnauthorizedException.</summary>
    Task<UserAuthState> GetCurrentUserStateAsync(CancellationToken cancellationToken);

    /// <summary>Người không phải SUPER_ADMIN chỉ được cấp quyền mà chính họ đang có.</summary>
    Task EnsureCanGrantPermissionsAsync(IReadOnlyCollection<int> permissionIds, CancellationToken cancellationToken);

    /// <summary>Người không phải SUPER_ADMIN không gán/gỡ role SUPER_ADMIN, không gán role có quyền vượt quyền của họ.</summary>
    Task EnsureCanAssignRolesAsync(IReadOnlyCollection<Role> roles, CancellationToken cancellationToken);

    /// <summary>Xóa cache 1 user (đổi role, khóa, đổi mật khẩu).</summary>
    void InvalidateUser(int userId);

    /// <summary>Xóa cache mọi user (sửa/xóa role, đổi quyền của role).</summary>
    void InvalidateAll();
}
