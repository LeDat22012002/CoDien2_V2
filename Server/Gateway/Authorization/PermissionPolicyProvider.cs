using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Server.Gateway.Authorization;

/// <summary>Tạo policy "perm:&lt;code&gt;" động; các policy khác (kể cả fallback) giao cho provider mặc định.</summary>
public class PermissionPolicyProvider(IOptions<AuthorizationOptions> options) : DefaultAuthorizationPolicyProvider(options)
{
    public override async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!policyName.StartsWith(HasPermissionAttribute.PolicyPrefix, StringComparison.Ordinal))
        {
            return await base.GetPolicyAsync(policyName);
        }

        var permissionCodes = policyName[HasPermissionAttribute.PolicyPrefix.Length..]
            .Split(HasPermissionAttribute.Separator, StringSplitOptions.RemoveEmptyEntries);
        return new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new PermissionRequirement(permissionCodes))
            .Build();
    }
}
