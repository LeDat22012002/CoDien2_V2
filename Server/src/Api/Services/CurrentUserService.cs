using System.Security.Claims;
using Server.Application.Common.Interfaces;

namespace Server.Api.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public string? UserName => User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue("sub");

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
}
