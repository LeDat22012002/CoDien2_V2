using Server.Modules.Identity.DTOs;

namespace Server.Modules.Identity.Services.Interfaces;

public interface IAuthService
{
    Task<AuthSession> LoginAsync(LoginRequest request, string? clientIp, CancellationToken cancellationToken);

    /// <summary>Xoay vòng refresh token. Token không hợp lệ/hết hạn → UnauthorizedException.</summary>
    Task<AuthSession> RefreshAsync(string? refreshToken, string? clientIp, CancellationToken cancellationToken);

    Task LogoutAsync(string? refreshToken, CancellationToken cancellationToken);

    Task<MeDto> GetMeAsync(CancellationToken cancellationToken);

    /// <summary>Đổi mật khẩu, thu hồi mọi phiên cũ, cấp phiên mới cho thiết bị hiện tại.</summary>
    Task<AuthSession> ChangePasswordAsync(
        ChangePasswordRequest request, string? clientIp, CancellationToken cancellationToken);
}
