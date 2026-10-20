using Server.Modules.Organization.Entities;

namespace Server.Modules.Organization.Repositories.Interfaces;

public interface IPositionLevelRepository
{
    Task<IReadOnlyList<PositionLevel>> GetListAsync(CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật.</summary>
    Task<PositionLevel?> FindByCodeAsync(string code, CancellationToken cancellationToken);
}
