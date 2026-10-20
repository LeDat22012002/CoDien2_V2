using Server.Data;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;
using Server.Modules.Identity.Services.Interfaces;
using Server.Modules.Identity.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.Identity.Services;

public class RoleService(
    IRoleRepository roleRepository,
    IPermissionRepository permissionRepository,
    IPermissionService permissionService,
    IUnitOfWork unitOfWork) : IRoleService
{
    private const string RoleNotFoundMessage = "Không tìm thấy vai trò.";

    public Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken) =>
        roleRepository.GetAllAsync(cancellationToken);

    public async Task<RoleDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        await roleRepository.GetDetailAsync(id, cancellationToken)
        ?? throw new NotFoundException(RoleNotFoundMessage);

    public async Task<RoleDetailDto> CreateAsync(CreateRoleRequest request, CancellationToken cancellationToken)
    {
        request.Code = request.Code?.Trim().ToUpperInvariant() ?? string.Empty;
        Normalize(request);
        RoleRequestValidator.Validate(request);

        if (await roleRepository.IsCodeTakenAsync(request.Code, cancellationToken))
        {
            throw FieldError("code", $"Mã vai trò '{request.Code}' đã tồn tại.");
        }

        var permissionIds = await GetValidPermissionIdsAsync(request.PermissionIds, cancellationToken);
        await permissionService.EnsureCanGrantPermissionsAsync(permissionIds, cancellationToken);

        var role = new Role
        {
            Code = request.Code,
            Name = request.Name,
            Description = request.Description,
            IsActive = request.IsActive,
            IsSystem = false,
        };
        foreach (var permissionId in permissionIds)
        {
            role.RolePermissions.Add(new RolePermission { PermissionId = permissionId });
        }

        roleRepository.Add(role);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(role.Id, cancellationToken);
    }

    public async Task<RoleDetailDto> UpdateAsync(int id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        RoleRequestValidator.Validate(request);

        var role = await roleRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(RoleNotFoundMessage);

        if (role.IsSystem)
        {
            throw new BusinessException("Không thể sửa vai trò hệ thống.");
        }

        var newPermissionIds = (await GetValidPermissionIdsAsync(request.PermissionIds, cancellationToken)).ToHashSet();
        var oldPermissionIds = role.RolePermissions.Select(x => x.PermissionId).ToHashSet();
        var changedPermissionIds = newPermissionIds.Except(oldPermissionIds)
            .Union(oldPermissionIds.Except(newPermissionIds))
            .ToList();
        await permissionService.EnsureCanGrantPermissionsAsync(changedPermissionIds, cancellationToken);

        role.Name = request.Name;
        role.Description = request.Description;
        role.IsActive = request.IsActive;

        foreach (var rolePermission in role.RolePermissions.Where(x => !newPermissionIds.Contains(x.PermissionId)).ToList())
        {
            role.RolePermissions.Remove(rolePermission);
        }

        foreach (var permissionId in newPermissionIds.Except(oldPermissionIds))
        {
            role.RolePermissions.Add(new RolePermission { PermissionId = permissionId });
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Quyền của role đổi → mọi user có role này phải nạp lại quyền
        permissionService.InvalidateAll();
        return await GetByIdAsync(role.Id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var role = await roleRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(RoleNotFoundMessage);

        if (role.IsSystem)
        {
            throw new BusinessException("Không thể xóa vai trò hệ thống.");
        }

        var userCount = await roleRepository.CountUsersAsync(id, cancellationToken);
        if (userCount > 0)
        {
            throw new BusinessException(
                $"Vai trò đang được gán cho {userCount} tài khoản. Hãy gỡ vai trò khỏi các tài khoản trước khi xóa.");
        }

        roleRepository.Remove(role);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        permissionService.InvalidateAll();
    }

    private async Task<List<int>> GetValidPermissionIdsAsync(List<int> permissionIds, CancellationToken cancellationToken)
    {
        var distinctIds = permissionIds.Distinct().ToList();
        if (distinctIds.Count == 0)
        {
            return distinctIds;
        }

        var existingIds = await permissionRepository.GetExistingIdsAsync(distinctIds, cancellationToken);
        if (existingIds.Count != distinctIds.Count)
        {
            throw FieldError("permissionIds", "Có quyền không tồn tại.");
        }

        return distinctIds;
    }

    private static void Normalize(RoleRequestBase request)
    {
        request.Name = request.Name?.Trim() ?? string.Empty;
        request.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        request.PermissionIds ??= [];
    }

    private static ValidationException FieldError(string field, string message) =>
        new("Dữ liệu không hợp lệ.", new Dictionary<string, string[]> { [field] = [message] });
}
