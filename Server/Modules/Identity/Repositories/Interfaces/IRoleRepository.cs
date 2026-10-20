using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Repositories.Interfaces;

public interface IRoleRepository
{
    Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<RoleDetailDto?> GetDetailAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking, kèm RolePermissions; dùng khi cập nhật.</summary>
    Task<Role?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Không tracking, kèm RolePermissions; dùng để kiểm tra trước khi gán role.</summary>
    Task<IReadOnlyList<Role>> GetByIdsAsync(IReadOnlyCollection<int> ids, CancellationToken cancellationToken);

    Task<Role?> GetByCodeAsync(string code, CancellationToken cancellationToken);

    Task<bool> IsCodeTakenAsync(string code, CancellationToken cancellationToken);

    Task<int> CountUsersAsync(int roleId, CancellationToken cancellationToken);

    void Add(Role role);

    void Remove(Role role);
}
