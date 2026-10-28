using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Employees.Entities;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;

namespace Server.Modules.Identity.Repositories;

public class UserRepository(AppDbContext dbContext) : IUserRepository
{
    private DbSet<User> Users => dbContext.Set<User>();

    public async Task<(IReadOnlyList<UserDto> Items, int TotalCount)> GetPagedAsync(
        UserFilterRequest filter, CancellationToken cancellationToken)
    {
        var query = Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();
            query = query.Where(x => x.Employee.EmpCode.Contains(keyword)
                                     || x.Employee.FullName.Contains(keyword)
                                     || (x.Employee.Email != null && x.Employee.Email.Contains(keyword)));
        }

        if (filter.RoleId is { } roleId)
        {
            query = query.Where(x => x.UserRoles.Any(ur => ur.RoleId == roleId));
        }

        if (filter.IsActive is { } isActive)
        {
            query = query.Where(x => x.IsActive == isActive);
        }

        var now = DateTime.UtcNow;
        if (filter.IsLocked is { } isLocked)
        {
            query = isLocked
                ? query.Where(x => x.LockoutEnd != null && x.LockoutEnd > now)
                : query.Where(x => x.LockoutEnd == null || x.LockoutEnd <= now);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.Employee.EmpCode)
            .Skip((filter.PageIndex - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(ToDto(now))
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<UserDto?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Users.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(ToDto(DateTime.UtcNow))
            .FirstOrDefaultAsync(cancellationToken);

    public Task<User?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Users
            .Include(x => x.Employee)
            .Include(x => x.UserRoles)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<User?> FindByEmpCodeAsync(string empCode, CancellationToken cancellationToken) =>
        Users
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Employee.EmpCode == empCode, cancellationToken);

    public Task<Employee?> GetEmployeeAsync(int employeeId, CancellationToken cancellationToken) =>
        dbContext.Set<Employee>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, cancellationToken);

    public Task<bool> HasAccountAsync(int employeeId, CancellationToken cancellationToken) =>
        Users.AnyAsync(x => x.EmployeeId == employeeId, cancellationToken);

    public async Task<IReadOnlyList<AvailableEmployeeDto>> GetAvailableEmployeesAsync(
        string? keyword, CancellationToken cancellationToken)
    {
        var query = dbContext.Set<Employee>().AsNoTracking()
            .Where(e => e.Status == EmployeeStatus.Active && !Users.Any(u => u.EmployeeId == e.Id));

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var trimmed = keyword.Trim();
            query = query.Where(e => e.EmpCode.Contains(trimmed)
                                     || e.FullName.Contains(trimmed)
                                     || (e.Email != null && e.Email.Contains(trimmed)));
        }

        return await query
            .OrderBy(e => e.EmpCode)
            .Take(50)
            .Select(e => new AvailableEmployeeDto
            {
                Id = e.Id,
                EmpCode = e.EmpCode,
                FullName = e.FullName,
                AvatarUrl = e.AvatarUrl,
                Email = e.Email,
                Phone = e.Phone,
            })
            .ToListAsync(cancellationToken);
    }

    public Task<int> CountActiveUsersInRoleAsync(int roleId, int? excludeUserId, CancellationToken cancellationToken) =>
        Users.CountAsync(
            x => x.IsActive
                 && x.UserRoles.Any(ur => ur.RoleId == roleId)
                 && (excludeUserId == null || x.Id != excludeUserId),
            cancellationToken);

    public void Add(User user) => Users.Add(user);

    public void Remove(User user) => Users.Remove(user);

    private static Expression<Func<User, UserDto>> ToDto(DateTime now) => x => new UserDto
    {
        Id = x.Id,
        EmployeeId = x.EmployeeId,
        EmpCode = x.Employee.EmpCode,
        FullName = x.Employee.FullName,
        AvatarUrl = x.Employee.AvatarUrl,
        Email = x.Employee.Email,
        Phone = x.Employee.Phone,
        EmployeeStatus = x.Employee.Status,
        IsActive = x.IsActive,
        IsLocked = x.LockoutEnd != null && x.LockoutEnd > now,
        LockoutEnd = x.LockoutEnd,
        LastLoginAt = x.LastLoginAt,
        CreatedAt = x.CreatedAt,
        Roles = x.UserRoles
            .OrderBy(ur => ur.Role.Name)
            .Select(ur => new RoleSummaryDto { Id = ur.Role.Id, Code = ur.Role.Code, Name = ur.Role.Name })
            .ToList(),
    };
}
