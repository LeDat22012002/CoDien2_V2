using Server.Modules.Documents.DTOs;
using Server.Shared.Models;

namespace Server.Modules.Documents.Services.Interfaces;

public interface IDocumentTemplateService
{
    Task<IReadOnlyList<DocumentTemplateDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<PagedResult<DocumentTemplateDto>> GetPagedAsync(
        DocumentTemplateFilterRequest filter, CancellationToken cancellationToken);

    Task<DocumentTemplateDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<DocumentTemplateDto> CreateAsync(CreateDocumentTemplateRequest request, CancellationToken cancellationToken);

    Task<DocumentTemplateDto> UpdateAsync(
        int id, UpdateDocumentTemplateRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
