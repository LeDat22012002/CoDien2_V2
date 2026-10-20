using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;

namespace Server.Modules.Identity.Repositories;

public class RefreshTokenRepository(AppDbContext dbContext) : IRefreshTokenRepository
{
    private DbSet<RefreshToken> RefreshTokens => dbContext.Set<RefreshToken>();

    public Task<RefreshToken?> FindByHashAsync(string tokenHash, CancellationToken cancellationToken) =>
        RefreshTokens
            .Include(x => x.User)
            .ThenInclude(x => x.Employee)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

    public Task RevokeAllAsync(int userId, DateTime revokedAt, CancellationToken cancellationToken) =>
        RefreshTokens
            .IgnoreQueryFilters()
            .Where(x => x.UserId == userId && x.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.RevokedAt, revokedAt), cancellationToken);

    public void Add(RefreshToken refreshToken) => RefreshTokens.Add(refreshToken);
}
