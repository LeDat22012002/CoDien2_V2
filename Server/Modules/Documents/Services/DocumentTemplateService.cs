using Server.Data;
using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Entities;
using Server.Modules.Documents.Repositories.Interfaces;
using Server.Modules.Documents.Services.Interfaces;
using Server.Modules.Documents.Validators;
using Server.Shared.Exceptions;
using Server.Shared.Models;

namespace Server.Modules.Documents.Services;

public class DocumentTemplateService(IDocumentTemplateRepository templateRepository, IUnitOfWork unitOfWork)
    : IDocumentTemplateService
{
    private const string TemplateNotFoundMessage = "Không tìm thấy biểu mẫu.";

    public async Task<IReadOnlyList<DocumentTemplateDto>> GetAllAsync(CancellationToken cancellationToken) =>
        (await templateRepository.GetAllAsync(cancellationToken)).Select(ToDto).ToList();

    public async Task<PagedResult<DocumentTemplateDto>> GetPagedAsync(
        DocumentTemplateFilterRequest filter, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await templateRepository.GetPagedAsync(filter, cancellationToken);

        return new PagedResult<DocumentTemplateDto>
        {
            Items = items.Select(ToDto).ToList(),
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public async Task<DocumentTemplateDto> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        ToDto(await templateRepository.GetByIdAsync(id, cancellationToken)
              ?? throw new NotFoundException(TemplateNotFoundMessage));

    public async Task<DocumentTemplateDto> CreateAsync(
        CreateDocumentTemplateRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        DocumentTemplateRequestValidator.Validate(request);
        await EnsureNameAvailableAsync(request.Name, null, cancellationToken);

        var template = new DocumentTemplate();
        Apply(template, request);
        templateRepository.Add(template);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(template);
    }

    public async Task<DocumentTemplateDto> UpdateAsync(
        int id, UpdateDocumentTemplateRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        DocumentTemplateRequestValidator.Validate(request);

        var template = await templateRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(TemplateNotFoundMessage);

        await EnsureNameAvailableAsync(request.Name, id, cancellationToken);

        Apply(template, request);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(template);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var template = await templateRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(TemplateNotFoundMessage);

        if (await templateRepository.IsUsedAsync(id, cancellationToken))
        {
            throw new BusinessException("Không thể xóa! Biểu mẫu này đã được dùng để cấp số văn bản.");
        }

        templateRepository.Remove(template);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureNameAvailableAsync(string name, int? excludeId, CancellationToken cancellationToken)
    {
        if (await templateRepository.IsNameTakenAsync(name, excludeId, cancellationToken))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["name"] = [$"Tên biểu mẫu '{name}' đã tồn tại."],
            });
        }
    }

    private static void Normalize(DocumentTemplateRequestBase request)
    {
        request.Code = request.Code?.Trim() ?? string.Empty;
        request.Name = request.Name?.Trim() ?? string.Empty;
        request.NumberSuffix = request.NumberSuffix?.Trim() ?? string.Empty;
        request.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        request.Process = string.IsNullOrWhiteSpace(request.Process) ? null : request.Process.Trim();
    }

    private static void Apply(DocumentTemplate template, DocumentTemplateRequestBase request)
    {
        template.Code = request.Code;
        template.Name = request.Name;
        template.NumberSuffix = request.NumberSuffix;
        template.Description = request.Description;
        template.StartNumber = request.StartNumber;
        template.Process = request.Process;
    }

    private static DocumentTemplateDto ToDto(DocumentTemplate template) => new()
    {
        Id = template.Id,
        Code = template.Code,
        Name = template.Name,
        NumberSuffix = template.NumberSuffix,
        Description = template.Description,
        StartNumber = template.StartNumber,
        Process = template.Process,
    };
}
