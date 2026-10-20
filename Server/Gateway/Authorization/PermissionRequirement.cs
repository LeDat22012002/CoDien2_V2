using Microsoft.AspNetCore.Authorization;

namespace Server.Gateway.Authorization;

/// <summary>Đạt khi user có ít nhất 1 trong các quyền.</summary>
public class PermissionRequirement(IReadOnlyList<string> permissionCodes) : IAuthorizationRequirement
{
    public IReadOnlyList<string> PermissionCodes { get; } = permissionCodes;
}
