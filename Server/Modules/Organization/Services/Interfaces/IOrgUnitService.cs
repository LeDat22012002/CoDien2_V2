using Server.Modules.Organization.DTOs;

namespace Server.Modules.Organization.Services.Interfaces;

public interface IOrgUnitService
{
    Task<IReadOnlyList<OrgUnitDto>> GetListAsync(OrgUnitFilterRequest filter, CancellationToken cancellationToken);

    Task<OrgUnitDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Đơn vị cấp 1 (ngay dưới Nhà máy), vd các xưởng; dùng cho module khác (Incidents…).</summary>
    Task<IReadOnlyList<OrgUnitDto>> GetTopLevelUnitsAsync(bool includeInactive, CancellationToken cancellationToken);

    Task<OrgUnitDto> CreateAsync(CreateOrgUnitRequest request, CancellationToken cancellationToken);

    Task<OrgUnitDto> UpdateAsync(int id, UpdateOrgUnitRequest request, CancellationToken cancellationToken);

    Task ReorderAsync(ReorderOrgUnitsRequest request, CancellationToken cancellationToken);

    /// <summary>Xóa mềm (IsActive false).</summary>
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
