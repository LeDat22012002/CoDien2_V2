using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Documents.Controllers;

[ApiController]
[Route("api/document-templates")]
public class DocumentTemplatesController(IDocumentTemplateService templateService) : ControllerBase
{
    /// <summary>Toàn bộ biểu mẫu cho ô chọn và tab lọc ở trang Lấy số văn bản (công khai).</summary>
    [AllowAnonymous]
    [HttpGet("options")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DocumentTemplateDto>>>> GetOptions(
        CancellationToken cancellationToken)
    {
        var result = await templateService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DocumentTemplateDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.DocumentTemplates.Manage)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<DocumentTemplateDto>>>> GetPaged(
        [FromQuery] DocumentTemplateFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await templateService.GetPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<DocumentTemplateDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.DocumentTemplates.Manage)]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<DocumentTemplateDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await templateService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<DocumentTemplateDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.DocumentTemplates.Manage)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<DocumentTemplateDto>>> Create(
        CreateDocumentTemplateRequest request, CancellationToken cancellationToken)
    {
        var result = await templateService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<DocumentTemplateDto>.Ok(result, "Thêm biểu mẫu thành công."));
    }

    [HasPermission(PermissionCodes.DocumentTemplates.Manage)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<DocumentTemplateDto>>> Update(
        int id, UpdateDocumentTemplateRequest request, CancellationToken cancellationToken)
    {
        var result = await templateService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DocumentTemplateDto>.Ok(result, "Cập nhật biểu mẫu thành công."));
    }

    [HasPermission(PermissionCodes.DocumentTemplates.Manage)]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await templateService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa biểu mẫu thành công."));
    }
}
