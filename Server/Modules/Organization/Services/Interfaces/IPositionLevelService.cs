using Server.Modules.Organization.DTOs;

namespace Server.Modules.Organization.Services.Interfaces;

public interface IPositionLevelService
{
    Task<IReadOnlyList<PositionLevelDto>> GetListAsync(CancellationToken cancellationToken);

    Task<PositionLevelDto> UpdateAsync(string code, UpdatePositionLevelRequest request, CancellationToken cancellationToken);
}
