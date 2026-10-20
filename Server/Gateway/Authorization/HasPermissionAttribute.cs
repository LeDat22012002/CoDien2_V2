using Microsoft.AspNetCore.Authorization;

namespace Server.Gateway.Authorization;

/// <summary>
/// Yêu cầu người gọi có quyền chỉ định, vd <c>[HasPermission(PermissionCodes.Employees.Create)]</c>.
/// Truyền nhiều mã = chỉ cần có 1 trong các quyền đó. SUPER_ADMIN luôn đạt. Thiếu quyền → 403.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class HasPermissionAttribute(params string[] permissionCodes)
    : AuthorizeAttribute(PolicyPrefix + string.Join(Separator, permissionCodes))
{
    public const string PolicyPrefix = "perm:";
    public const char Separator = '|';
}
