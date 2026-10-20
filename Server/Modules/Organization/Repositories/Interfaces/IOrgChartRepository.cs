using Server.Modules.Organization.Entities;

namespace Server.Modules.Organization.Repositories.Interfaces;

/// <summary>Đọc dữ liệu dựng sơ đồ (view + danh mục), chỉ đọc.</summary>
public interface IOrgChartRepository
{
    Task<IReadOnlyList<VOrgUnit>> GetUnitsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<VUnitMember>> GetAllMembersAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<VUnitMember>> GetMembersByUnitAsync(int orgUnitId, CancellationToken cancellationToken);

    Task<IReadOnlyList<PositionLevel>> GetPositionLevelsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<OrgUnitType>> GetUnitTypesAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<OrgUnitTypeParent>> GetUnitTypeParentsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<Discipline>> GetDisciplinesAsync(CancellationToken cancellationToken);
}
