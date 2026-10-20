using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Repositories.Interfaces;

public interface IRefreshTokenRepository
{
    /// <summary>Có tracking, kèm User và Employee.</summary>
    Task<RefreshToken?> FindByHashAsync(string tokenHash, CancellationToken cancellationToken);

    /// <summary>Thu hồi ngay (không chờ SaveChanges) mọi refresh token còn hiệu lực của user.</summary>
    Task RevokeAllAsync(int userId, DateTime revokedAt, CancellationToken cancellationToken);

    void Add(RefreshToken refreshToken);
}
