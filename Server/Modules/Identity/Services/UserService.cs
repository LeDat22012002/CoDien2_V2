using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Server.Data;
using Server.Modules.Employees.Entities;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;
using Server.Modules.Identity.Services.Interfaces;
using Server.Modules.Identity.Validators;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Exceptions;
using Server.Shared.Models;
using Server.Shared.Services;

namespace Server.Modules.Identity.Services;

public class UserService(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IPermissionService permissionService,
    IPasswordHasher<User> passwordHasher,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IAssignmentService assignmentService,
    IOptions<AuthOptions> authOptions) : IUserService
{
    private const string UserNotFoundMessage = "Không tìm thấy tài khoản.";

    private readonly AuthOptions _options = authOptions.Value;

    public async Task<PagedResult<UserDto>> GetPagedAsync(UserFilterRequest filter, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await userRepository.GetPagedAsync(filter, cancellationToken);
        await AttachPrimaryAssignmentsAsync(items, x => x.EmployeeId, cancellationToken);

        return new PagedResult<UserDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public async Task<UserDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(UserNotFoundMessage);

        await AttachPrimaryAssignmentsAsync([user], x => x.EmployeeId, cancellationToken);
        return user;
    }

    public async Task<IReadOnlyList<AvailableEmployeeDto>> GetAvailableEmployeesAsync(
        string? keyword, CancellationToken cancellationToken)
    {
        var employees = await userRepository.GetAvailableEmployeesAsync(keyword, cancellationToken);
        await AttachPrimaryAssignmentsAsync(employees, x => x.Id, cancellationToken);
        return employees;
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        UserRequestValidator.Validate(request, _options.Password);

        var employee = await userRepository.GetEmployeeAsync(request.EmployeeId, cancellationToken)
            ?? throw FieldError("employeeId", "Nhân viên không tồn tại.");

        if (employee.Status != EmployeeStatus.Active)
        {
            throw FieldError("employeeId", "Nhân viên không còn làm việc, không thể tạo tài khoản.");
        }

        if (await userRepository.HasAccountAsync(employee.Id, cancellationToken))
        {
            throw FieldError("employeeId", $"Nhân viên {employee.EmpCode} đã có tài khoản.");
        }

        var roles = await GetRolesAsync(request.RoleIds.Distinct().ToList(), cancellationToken);
        await permissionService.EnsureCanAssignRolesAsync(roles, cancellationToken);

        var user = new User
        {
            EmployeeId = employee.Id,
            IsActive = true,
            MustChangePassword = false,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        var now = DateTime.UtcNow;
        foreach (var role in roles)
        {
            user.UserRoles.Add(new UserRole { RoleId = role.Id, AssignedAt = now, AssignedBy = currentUserService.UserName });
        }

        userRepository.Add(user);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(user.Id, cancellationToken);
    }

    public async Task<UserDto> UpdateAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(UserNotFoundMessage);

        var current = await permissionService.GetCurrentUserStateAsync(cancellationToken);
        var newRoleIds = request.RoleIds.Distinct().ToHashSet();
        var oldRoleIds = user.UserRoles.Select(x => x.RoleId).ToHashSet();
        var isRolesChanged = !newRoleIds.SetEquals(oldRoleIds);
        var isActiveChanged = user.IsActive != request.IsActive;

        if (user.Id == current.UserId && (isRolesChanged || isActiveChanged))
        {
            throw new BusinessException("Không thể tự thay đổi vai trò hoặc trạng thái tài khoản của chính mình.");
        }

        await EnsureCanManageUserAsync(user.Id, current, cancellationToken);

        var changedRoleIds = newRoleIds.Except(oldRoleIds).Union(oldRoleIds.Except(newRoleIds)).ToList();
        var changedRoles = await GetRolesAsync(changedRoleIds, cancellationToken);
        await permissionService.EnsureCanAssignRolesAsync(changedRoles, cancellationToken);
        await EnsureNotRemovingLastSuperAdminAsync(user, newRoleIds, request.IsActive, cancellationToken);

        var now = DateTime.UtcNow;
        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            foreach (var userRole in user.UserRoles.Where(x => !newRoleIds.Contains(x.RoleId)).ToList())
            {
                user.UserRoles.Remove(userRole);
            }

            foreach (var roleId in newRoleIds.Except(oldRoleIds))
            {
                user.UserRoles.Add(new UserRole { RoleId = roleId, AssignedAt = now, AssignedBy = currentUserService.UserName });
            }

            if (isActiveChanged)
            {
                user.IsActive = request.IsActive;
                if (!request.IsActive)
                {
                    // Ngừng tài khoản: vô hiệu ngay mọi phiên đang đăng nhập
                    user.RenewSecurityStamp();
                    await refreshTokenRepository.RevokeAllAsync(user.Id, now, ct);
                }
            }
        }, cancellationToken);

        permissionService.InvalidateUser(user.Id);
        return await GetByIdAsync(user.Id, cancellationToken);
    }

    public async Task ResetPasswordAsync(int id, ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        UserRequestValidator.Validate(request, _options.Password);

        var user = await userRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(UserNotFoundMessage);

        var current = await permissionService.GetCurrentUserStateAsync(cancellationToken);
        await EnsureCanManageUserAsync(user.Id, current, cancellationToken);

        var now = DateTime.UtcNow;
        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
            user.FailedLoginCount = 0;
            user.LockoutEnd = null;
            user.RenewSecurityStamp();
            await refreshTokenRepository.RevokeAllAsync(user.Id, now, ct);
        }, cancellationToken);

        permissionService.InvalidateUser(user.Id);
    }

    public async Task UnlockAsync(int id, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(UserNotFoundMessage);

        var current = await permissionService.GetCurrentUserStateAsync(cancellationToken);
        await EnsureCanManageUserAsync(user.Id, current, cancellationToken);

        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(UserNotFoundMessage);

        var current = await permissionService.GetCurrentUserStateAsync(cancellationToken);
        if (user.Id == current.UserId)
        {
            throw new BusinessException("Không thể tự xóa tài khoản của chính mình.");
        }

        await EnsureCanManageUserAsync(user.Id, current, cancellationToken);
        await EnsureNotRemovingLastSuperAdminAsync(user, new HashSet<int>(), false, cancellationToken);

        var now = DateTime.UtcNow;
        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            // Vô hiệu ngay mọi phiên đang đăng nhập rồi xóa mềm
            user.RenewSecurityStamp();
            await refreshTokenRepository.RevokeAllAsync(user.Id, now, ct);
            userRepository.Remove(user);
        }, cancellationToken);

        permissionService.InvalidateUser(user.Id);
    }

    /// <summary>Gắn chức danh, đơn vị của vị trí chính đang giữ (danh sách đã xếp vị trí chính trước, mới nhất trước).</summary>
    private async Task AttachPrimaryAssignmentsAsync<T>(
        IReadOnlyCollection<T> items, Func<T, int> getEmployeeId, CancellationToken cancellationToken)
    {
        var assignments = await assignmentService.GetCurrentAssignmentsAsync(
            items.Select(getEmployeeId).Distinct().ToList(), cancellationToken);
        var primaryByEmployee = assignments
            .GroupBy(x => x.EmployeeId)
            .ToDictionary(x => x.Key, x => x.First());

        foreach (var item in items)
        {
            if (!primaryByEmployee.TryGetValue(getEmployeeId(item), out var assignment))
            {
                continue;
            }

            switch (item)
            {
                case UserDto user:
                    user.JobTitle = assignment.JobTitle ?? assignment.LevelName;
                    user.OrgUnitName = assignment.OrgUnitName;
                    user.IsActing = assignment.IsActing;
                    break;
                case AvailableEmployeeDto employee:
                    employee.JobTitle = assignment.JobTitle ?? assignment.LevelName;
                    employee.OrgUnitName = assignment.OrgUnitName;
                    break;
            }
        }
    }

    /// <summary>Chỉ SUPER_ADMIN mới được sửa / đặt lại mật khẩu tài khoản SUPER_ADMIN khác.</summary>
    private async Task EnsureCanManageUserAsync(int targetUserId, UserAuthState current, CancellationToken cancellationToken)
    {
        if (current.IsSuperAdmin)
        {
            return;
        }

        var target = await permissionService.GetAuthStateAsync(targetUserId, cancellationToken);
        if (target?.IsSuperAdmin == true)
        {
            throw new ForbiddenException("Chỉ quản trị viên tổng mới được thao tác trên tài khoản quản trị viên tổng.");
        }
    }

    private async Task EnsureNotRemovingLastSuperAdminAsync(
        User user, IReadOnlySet<int> newRoleIds, bool newIsActive, CancellationToken cancellationToken)
    {
        var superAdminRole = await roleRepository.GetByCodeAsync(RoleCodes.SuperAdmin, cancellationToken);
        if (superAdminRole is null)
        {
            return;
        }

        var wasSuperAdmin = user.IsActive && user.UserRoles.Any(x => x.RoleId == superAdminRole.Id);
        var willBeSuperAdmin = newIsActive && newRoleIds.Contains(superAdminRole.Id);
        if (wasSuperAdmin && !willBeSuperAdmin
            && await userRepository.CountActiveUsersInRoleAsync(superAdminRole.Id, user.Id, cancellationToken) == 0)
        {
            throw new BusinessException("Phải còn ít nhất 1 quản trị viên tổng đang hoạt động.");
        }
    }

    private async Task<IReadOnlyList<Role>> GetRolesAsync(List<int> roleIds, CancellationToken cancellationToken)
    {
        if (roleIds.Count == 0)
        {
            return [];
        }

        var roles = await roleRepository.GetByIdsAsync(roleIds, cancellationToken);
        if (roles.Count != roleIds.Count)
        {
            throw FieldError("roleIds", "Có vai trò không tồn tại hoặc đã bị xóa.");
        }

        return roles;
    }

    private static ValidationException FieldError(string field, string message) =>
        new("Dữ liệu không hợp lệ.", new Dictionary<string, string[]> { [field] = [message] });
}
