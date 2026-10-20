using Server.Shared.Models;

namespace Server.Modules.Documents.DTOs;

// ===== Response =====

public class DocumentTemplateDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string NumberSuffix { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int? StartNumber { get; init; }
    public string? Process { get; init; }
}

// ===== Request =====

public abstract class DocumentTemplateRequestBase
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string NumberSuffix { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? StartNumber { get; set; }
    public string? Process { get; set; }
}

public class CreateDocumentTemplateRequest : DocumentTemplateRequestBase;

public class UpdateDocumentTemplateRequest : DocumentTemplateRequestBase;

/// <summary>Keyword tìm theo tên biểu mẫu; mặc định sắp tên tăng dần.</summary>
public class DocumentTemplateFilterRequest : PagedRequest
{
    public bool SortDescending { get; set; }
}
