using System.Security.Claims;

namespace Server.Shared.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public string? UserName => User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue("sub");

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
}
