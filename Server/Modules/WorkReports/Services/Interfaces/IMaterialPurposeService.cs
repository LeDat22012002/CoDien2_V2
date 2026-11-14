using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

public interface IMaterialPurposeService
{
    Task<IReadOnlyList<MaterialPurposeDto>> GetListAsync(bool includeInactive, CancellationToken cancellationToken);

    Task<MaterialPurposeDto> CreateAsync(CreateMaterialPurposeRequest request, CancellationToken cancellationToken);

    Task<MaterialPurposeDto> UpdateAsync(
        int id, UpdateMaterialPurposeRequest request, CancellationToken cancellationToken);

    Task<MaterialPurposeDto> SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken);
}