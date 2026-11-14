using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

public interface IMaterialPurposeRepository
{
    Task<IReadOnlyList<MaterialPurpose>> GetListAsync(bool includeInactive, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật.</summary>
    Task<MaterialPurpose?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> IsCodeTakenAsync(string code, int? exceptId, CancellationToken cancellationToken);

    Task<int> GetMaxSortOrderAsync(CancellationToken cancellationToken);

    void Add(MaterialPurpose purpose);
}