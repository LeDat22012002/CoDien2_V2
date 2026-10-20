using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Repositories.Interfaces;

public interface IPermissionRepository
{
    Task<IReadOnlyList<Permission>> GetAllAsync(CancellationToken cancellationToken);

    Task<Permission?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<IReadOnlyList<int>> GetExistingIdsAsync(IReadOnlyCollection<int> ids, CancellationToken cancellationToken);

    /// <summary>Trạng thái tài khoản + role + quyền của user; null nếu user không tồn tại.</summary>
    Task<UserAuthState?> GetUserAuthStateAsync(int userId, CancellationToken cancellationToken);
}
