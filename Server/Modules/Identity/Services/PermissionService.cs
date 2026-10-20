using Microsoft.Extensions.Caching.Memory;
using Server.Data;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;
using Server.Modules.Identity.Services.Interfaces;
using Server.Modules.Identity.Validators;
using Server.Shared.Exceptions;
using Server.Shared.Services;

namespace Server.Modules.Identity.Services;

/// <summary>Quản lý danh mục quyền và kiểm tra quyền (cài đặt IPermissionChecker cho Gateway).</summary>
public class PermissionService(
    IPermissionRepository permissionRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IMemoryCache memoryCache) : IPermissionService, IPermissionChecker
{
    private const string CacheVersionKey = "identity:auth-version";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

    // ===== Danh mục quyền =====

    public async Task<IReadOnlyList<PermissionGroupDto>> GetGroupedAsync(CancellationToken cancellationToken)
    {
        var permissions = await permissionRepository.GetAllAsync(cancellationToken);

        return permissions
            .GroupBy(x => x.Module)
            .OrderBy(g => g.Min(x => x.SortOrder))
            .Select(g => new PermissionGroupDto
            {
                Module = g.Key,
                Permissions = g.Select(ToDto).ToList(),
            })
            .ToList();
    }

    public async Task<PermissionDto> UpdateAsync(
        int id, UpdatePermissionRequest request, CancellationToken cancellationToken)
    {
        request.Name = request.Name?.Trim() ?? string.Empty;
        PermissionRequestValidator.Validate(request);

        var permission = await permissionRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy quyền.");

        permission.Name = request.Name;
        permission.SortOrder = request.SortOrder;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(permission);
    }

    // ===== Kiểm tra quyền =====

    public async Task<bool> IsSessionValidAsync(int userId, string securityStamp, CancellationToken cancellationToken)
    {
        var state = await GetAuthStateAsync(userId, cancellationToken);
        return IsUsable(state) && state!.SecurityStamp == securityStamp;
    }

    public async Task<bool> HasPermissionAsync(int userId, string permissionCode, CancellationToken cancellationToken)
    {
        var state = await GetAuthStateAsync(userId, cancellationToken);
        return IsUsable(state) && (state!.IsSuperAdmin || state.PermissionCodes.Contains(permissionCode));
    }

    public Task<UserAuthState?> GetAuthStateAsync(int userId, CancellationToken cancellationToken) =>
        memoryCache.GetOrCreateAsync(GetCacheKey(userId), entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return permissionRepository.GetUserAuthStateAsync(userId, cancellationToken);
        });

    public async Task<UserAuthState> GetCurrentUserStateAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId
            ?? throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");

        var state = await GetAuthStateAsync(userId, cancellationToken);
        return IsUsable(state)
            ? state!
            : throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
    }

    // ===== Chống leo thang quyền =====

    public async Task EnsureCanGrantPermissionsAsync(
        IReadOnlyCollection<int> permissionIds, CancellationToken cancellationToken)
    {
        var current = await GetCurrentUserStateAsync(cancellationToken);
        if (current.IsSuperAdmin)
        {
            return;
        }

        if (permissionIds.Any(id => !current.PermissionIds.Contains(id)))
        {
            throw new ForbiddenException("Bạn chỉ được cấp các quyền mà chính bạn đang có.");
        }
    }

    public async Task EnsureCanAssignRolesAsync(IReadOnlyCollection<Role> roles, CancellationToken cancellationToken)
    {
        var current = await GetCurrentUserStateAsync(cancellationToken);
        if (current.IsSuperAdmin)
        {
            return;
        }

        if (roles.Any(x => x.Code == RoleCodes.SuperAdmin))
        {
            throw new ForbiddenException("Chỉ quản trị viên tổng mới được gán hoặc gỡ vai trò Quản trị viên tổng.");
        }

        var rolePermissionIds = roles.SelectMany(x => x.RolePermissions).Select(x => x.PermissionId);
        if (rolePermissionIds.Any(id => !current.PermissionIds.Contains(id)))
        {
            throw new ForbiddenException("Bạn chỉ được gán vai trò có quyền nằm trong quyền của chính bạn.");
        }
    }

    // ===== Cache =====

    public void InvalidateUser(int userId) => memoryCache.Remove(GetCacheKey(userId));

    public void InvalidateAll() => memoryCache.Set(CacheVersionKey, GetCacheVersion() + 1);

    /// <summary>Khóa cache gồm "phiên bản": tăng phiên bản = mọi khóa cũ không còn được dùng.</summary>
    private string GetCacheKey(int userId) => $"identity:auth:{GetCacheVersion()}:{userId}";

    private int GetCacheVersion() => memoryCache.GetOrCreate(CacheVersionKey, _ => 0);

    private static bool IsUsable(UserAuthState? state) => state is { IsActive: true, IsEmployeeActive: true };

    private static PermissionDto ToDto(Permission permission) => new()
    {
        Id = permission.Id,
        Code = permission.Code,
        Name = permission.Name,
        Module = permission.Module,
        SortOrder = permission.SortOrder,
    };
}
