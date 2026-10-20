using Server.Modules.Identity.DTOs;

namespace Server.Modules.Identity.Services.Interfaces;

public interface IRoleService
{
    Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<RoleDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<RoleDetailDto> CreateAsync(CreateRoleRequest request, CancellationToken cancellationToken);

    Task<RoleDetailDto> UpdateAsync(int id, UpdateRoleRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
