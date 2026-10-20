using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Employees.Entities;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;

namespace Server.Modules.Identity.Repositories;

public class PermissionRepository(AppDbContext dbContext) : IPermissionRepository
{
    private DbSet<Permission> Permissions => dbContext.Set<Permission>();

    public async Task<IReadOnlyList<Permission>> GetAllAsync(CancellationToken cancellationToken) =>
        await Permissions.AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Code)
            .ToListAsync(cancellationToken);

    public Task<Permission?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Permissions.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<int>> GetExistingIdsAsync(
        IReadOnlyCollection<int> ids, CancellationToken cancellationToken) =>
        await Permissions.Where(x => ids.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken);

    public async Task<UserAuthState?> GetUserAuthStateAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.Set<User>().AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new
            {
                x.SecurityStamp,
                x.IsActive,
                EmployeeStatus = x.Employee.Status,
                Roles = x.UserRoles
                    .Where(ur => ur.Role.IsActive)
                    .Select(ur => new RoleSummaryDto { Id = ur.Role.Id, Code = ur.Role.Code, Name = ur.Role.Name })
                    .ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (user is null)
        {
            return null;
        }

        var isSuperAdmin = user.Roles.Any(x => x.Code == RoleCodes.SuperAdmin);
        var roleIds = user.Roles.Select(x => x.Id).ToList();

        // SUPER_ADMIN có toàn bộ quyền; các role khác lấy theo RolePermission
        var permissions = isSuperAdmin
            ? await Permissions.AsNoTracking()
                .Select(x => new { x.Id, x.Code })
                .ToListAsync(cancellationToken)
            : await dbContext.Set<RolePermission>().AsNoTracking()
                .Where(x => roleIds.Contains(x.RoleId))
                .Select(x => new { x.Permission.Id, x.Permission.Code })
                .Distinct()
                .ToListAsync(cancellationToken);

        return new UserAuthState(
            userId,
            user.SecurityStamp,
            user.IsActive,
            user.EmployeeStatus == EmployeeStatus.Active,
            isSuperAdmin,
            user.Roles,
            permissions.Select(x => x.Code).ToHashSet(),
            permissions.Select(x => x.Id).ToHashSet());
    }
}
