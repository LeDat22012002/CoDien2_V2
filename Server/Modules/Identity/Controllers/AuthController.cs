using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Services.Interfaces;
using Server.Shared.Exceptions;
using Server.Shared.Models;

namespace Server.Modules.Identity.Controllers;

/// <summary>
/// Access token trả trong JSON (FE giữ trong bộ nhớ). Refresh token nằm trong cookie HttpOnly
/// chỉ gửi kèm các request tới /api/auth, JavaScript không đọc được.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    private const string RefreshTokenCookie = "refresh_token";
    private const string RefreshTokenCookiePath = "/api/auth";

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> Login(
        LoginRequest request, CancellationToken cancellationToken)
    {
        var session = await authService.LoginAsync(request, GetClientIp(), cancellationToken);
        SetRefreshTokenCookie(session);
        return Ok(ApiResponse<AuthResultDto>.Ok(session.Result, "Đăng nhập thành công."));
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> Refresh(CancellationToken cancellationToken)
    {
        try
        {
            var session = await authService.RefreshAsync(
                Request.Cookies[RefreshTokenCookie], GetClientIp(), cancellationToken);
            SetRefreshTokenCookie(session);
            return Ok(ApiResponse<AuthResultDto>.Ok(session.Result));
        }
        catch (UnauthorizedException)
        {
            DeleteRefreshTokenCookie();
            throw;
        }
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<ActionResult<ApiResponse<object>>> Logout(CancellationToken cancellationToken)
    {
        await authService.LogoutAsync(Request.Cookies[RefreshTokenCookie], cancellationToken);
        DeleteRefreshTokenCookie();
        return Ok(ApiResponse.Ok("Đăng xuất thành công."));
    }

    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<MeDto>>> Me(CancellationToken cancellationToken)
    {
        var result = await authService.GetMeAsync(cancellationToken);
        return Ok(ApiResponse<MeDto>.Ok(result));
    }

    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<AuthResultDto>>> ChangePassword(
        ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var session = await authService.ChangePasswordAsync(request, GetClientIp(), cancellationToken);
        SetRefreshTokenCookie(session);
        return Ok(ApiResponse<AuthResultDto>.Ok(session.Result, "Đổi mật khẩu thành công."));
    }

    private void SetRefreshTokenCookie(AuthSession session) =>
        Response.Cookies.Append(RefreshTokenCookie, session.RefreshToken, BuildCookieOptions(session.RefreshTokenExpiresAt));

    private void DeleteRefreshTokenCookie() =>
        Response.Cookies.Delete(RefreshTokenCookie, BuildCookieOptions(null));

    private CookieOptions BuildCookieOptions(DateTime? expiresAt) => new()
    {
        HttpOnly = true,
        Secure = Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = RefreshTokenCookiePath,
        Expires = expiresAt,
    };

    private string? GetClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();
}
