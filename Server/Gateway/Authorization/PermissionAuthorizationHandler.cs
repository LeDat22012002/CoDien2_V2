using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Server.Shared.Constants;
using Server.Shared.Services;

namespace Server.Gateway.Authorization;

public class PermissionAuthorizationHandler(IPermissionChecker permissionChecker)
    : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (!int.TryParse(context.User.FindFirstValue(AppClaimTypes.UserId), out var userId))
        {
            return;
        }

        var cancellationToken = (context.Resource as HttpContext)?.RequestAborted ?? CancellationToken.None;
        foreach (var permissionCode in requirement.PermissionCodes)
        {
            if (await permissionChecker.HasPermissionAsync(userId, permissionCode, cancellationToken))
            {
                context.Succeed(requirement);
                return;
            }
        }
    }
}
