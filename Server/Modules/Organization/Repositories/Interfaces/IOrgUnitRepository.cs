using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;

namespace Server.Modules.Organization.Repositories.Interfaces;

public interface IOrgUnitRepository
{
    Task<IReadOnlyList<OrgUnit>> GetListAsync(OrgUnitFilterRequest filter, CancellationToken cancellationToken);

    Task<OrgUnit?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật.</summary>
    Task<OrgUnit?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> IsCodeTakenAsync(string code, CancellationToken cancellationToken);

    Task<bool> IsTypeExistingAsync(string typeCode, CancellationToken cancellationToken);

    Task<bool> IsLevelActiveAsync(string levelCode, CancellationToken cancellationToken);

    Task<bool> IsDisciplineActiveAsync(string disciplineCode, CancellationToken cancellationToken);

    /// <summary>Loại đơn vị cha hợp lệ theo OrgUnitTypeParent; rỗng = loại gốc.</summary>
    Task<IReadOnlyList<string>> GetAllowedParentTypesAsync(string childTypeCode, CancellationToken cancellationToken);

    Task<int?> GetParentIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> HasActiveChildrenAsync(int id, CancellationToken cancellationToken);

    /// <summary>Còn người đang giữ vị trí (EndDate null) trong đơn vị.</summary>
    Task<bool> HasActiveMembersAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi sắp xếp lại.</summary>
    Task<IReadOnlyList<OrgUnit>> GetActiveChildrenAsync(int parentId, CancellationToken cancellationToken);

    void Add(OrgUnit orgUnit);
}
