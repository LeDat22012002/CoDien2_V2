using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;

namespace Server.Modules.Identity.Repositories;

public class RoleRepository(AppDbContext dbContext) : IRoleRepository
{
    private DbSet<Role> Roles => dbContext.Set<Role>();

    public async Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken) =>
        await Roles.AsNoTracking()
            .OrderByDescending(x => x.IsSystem)
            .ThenBy(x => x.Name)
            .Select(x => new RoleDto
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                Description = x.Description,
                IsSystem = x.IsSystem,
                IsActive = x.IsActive,
                UserCount = x.UserRoles.Count,
                PermissionCount = x.RolePermissions.Count,
            })
            .ToListAsync(cancellationToken);

    public Task<RoleDetailDto?> GetDetailAsync(int id, CancellationToken cancellationToken) =>
        Roles.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new RoleDetailDto
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                Description = x.Description,
                IsSystem = x.IsSystem,
                IsActive = x.IsActive,
                UserCount = x.UserRoles.Count,
                PermissionCount = x.RolePermissions.Count,
                PermissionIds = x.RolePermissions.Select(rp => rp.PermissionId).ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Role?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Roles
            .Include(x => x.RolePermissions)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Role>> GetByIdsAsync(
        IReadOnlyCollection<int> ids, CancellationToken cancellationToken) =>
        await Roles.AsNoTracking()
            .Include(x => x.RolePermissions)
            .Where(x => ids.Contains(x.Id))
            .ToListAsync(cancellationToken);

    public Task<Role?> GetByCodeAsync(string code, CancellationToken cancellationToken) =>
        Roles.AsNoTracking().FirstOrDefaultAsync(x => x.Code == code, cancellationToken);

    public Task<bool> IsCodeTakenAsync(string code, CancellationToken cancellationToken) =>
        Roles.AnyAsync(x => x.Code == code, cancellationToken);

    public Task<int> CountUsersAsync(int roleId, CancellationToken cancellationToken) =>
        dbContext.Set<UserRole>().CountAsync(x => x.RoleId == roleId, cancellationToken);

    public void Add(Role role) => Roles.Add(role);

    public void Remove(Role role) => Roles.Remove(role);
}
