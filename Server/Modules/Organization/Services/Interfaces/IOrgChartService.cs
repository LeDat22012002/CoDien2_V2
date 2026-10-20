using Server.Modules.Organization.DTOs;

namespace Server.Modules.Organization.Services.Interfaces;

public interface IOrgChartService
{
    Task<OrgChartTreeDto> GetTreeAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<UnitMemberDto>> GetMembersAsync(int orgUnitId, CancellationToken cancellationToken);

    Task<LookupsDto> GetLookupsAsync(CancellationToken cancellationToken);
}
