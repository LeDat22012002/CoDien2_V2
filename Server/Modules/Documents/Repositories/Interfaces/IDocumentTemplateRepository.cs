using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Entities;

namespace Server.Modules.Documents.Repositories.Interfaces;

public interface IDocumentTemplateRepository
{
    /// <summary>Toàn bộ biểu mẫu (cho ô chọn khi lấy số), sắp theo tên.</summary>
    Task<IReadOnlyList<DocumentTemplate>> GetAllAsync(CancellationToken cancellationToken);

    Task<(IReadOnlyList<DocumentTemplate> Items, int TotalCount)> GetPagedAsync(
        DocumentTemplateFilterRequest filter, CancellationToken cancellationToken);

    Task<DocumentTemplate?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật / xóa.</summary>
    Task<DocumentTemplate?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> IsNameTakenAsync(string name, int? excludeId, CancellationToken cancellationToken);

    /// <summary>Biểu mẫu đã được dùng để cấp số.</summary>
    Task<bool> IsUsedAsync(int id, CancellationToken cancellationToken);

    void Add(DocumentTemplate template);

    void Remove(DocumentTemplate template);
}
