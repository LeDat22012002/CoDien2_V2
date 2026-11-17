using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Materials.DTOs;
using Server.Modules.Materials.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Materials.Controllers;

/// <summary>
/// Danh mục vật tư.
/// - Gợi ý / tra mã (options, by-code): chỉ cần đăng nhập — người nhập báo cáo tuần dùng để tự điền tên, đơn vị tính.
/// - Danh sách, chi tiết, giá trị lọc (trang quản trị): materials.view hoặc materials.manage.
/// - Thêm / sửa / xóa: materials.manage.
/// </summary>
[ApiController]
[Route("api/materials")]
public class MaterialsController(IMaterialService materialService) : ControllerBase
{
    [HasPermission(PermissionCodes.Materials.View, PermissionCodes.Materials.Manage)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<MaterialDto>>>> GetPaged(
        [FromQuery] MaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await materialService.GetPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<MaterialDto>>.Ok(result));
    }

    /// <summary>Giá trị có sẵn cho các ô lọc: Plant, nhóm vật tư, loại vật tư, cấp vật tư.</summary>
    [HasPermission(PermissionCodes.Materials.View, PermissionCodes.Materials.Manage)]
    [HttpGet("lookups")]
    public async Task<ActionResult<ApiResponse<MaterialLookupsDto>>> GetLookups(CancellationToken cancellationToken)
    {
        var result = await materialService.GetLookupsAsync(cancellationToken);
        return Ok(ApiResponse<MaterialLookupsDto>.Ok(result));
    }

    /// <summary>Gợi ý khi gõ mã vật tư (tìm theo mã hoặc tên, tối đa 20 dòng, keyword ≥ 2 ký tự).</summary>
    [HttpGet("options")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MaterialOptionDto>>>> GetOptions(
        [FromQuery] string? keyword, CancellationToken cancellationToken)
    {
        var result = await materialService.GetOptionsAsync(keyword, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<MaterialOptionDto>>.Ok(result));
    }

    /// <summary>Tra đúng mã; data = null nếu mã chưa có trong danh mục (không phải lỗi, vẫn nhập tự do được).</summary>
    [HttpGet("by-code")]
    public async Task<ActionResult<ApiResponse<MaterialOptionDto>>> GetByCode(
        [FromQuery] string? code, CancellationToken cancellationToken)
    {
        var result = await materialService.GetByCodeAsync(code, cancellationToken);
        return Ok(ApiResponse<MaterialOptionDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.Materials.View, PermissionCodes.Materials.Manage)]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<MaterialDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await materialService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<MaterialDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.Materials.Manage)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<MaterialDto>>> Create(
        CreateMaterialRequest request, CancellationToken cancellationToken)
    {
        var result = await materialService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<MaterialDto>.Ok(result, "Thêm vật tư thành công."));
    }

    [HasPermission(PermissionCodes.Materials.Manage)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<MaterialDto>>> Update(
        int id, UpdateMaterialRequest request, CancellationToken cancellationToken)
    {
        var result = await materialService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<MaterialDto>.Ok(result, "Cập nhật vật tư thành công."));
    }

    [HasPermission(PermissionCodes.Materials.Manage)]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await materialService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa vật tư thành công."));
    }
}