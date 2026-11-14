using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>Mục đích sử dụng vật tư. Xem: chỉ cần đăng nhập; thêm/sửa/ngừng dùng: work-reports.configure.</summary>
[ApiController]
[Route("api/material-purposes")]
public class MaterialPurposesController(IMaterialPurposeService purposeService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<MaterialPurposeDto>>>> GetList(
        [FromQuery] bool includeInactive, CancellationToken cancellationToken)
    {
        var result = await purposeService.GetListAsync(includeInactive, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<MaterialPurposeDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.WorkReports.Configure)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<MaterialPurposeDto>>> Create(
        CreateMaterialPurposeRequest request, CancellationToken cancellationToken)
    {
        var result = await purposeService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<MaterialPurposeDto>.Ok(result, "Thêm mục đích sử dụng vật tư thành công."));
    }

    [HasPermission(PermissionCodes.WorkReports.Configure)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<MaterialPurposeDto>>> Update(
        int id, UpdateMaterialPurposeRequest request, CancellationToken cancellationToken)
    {
        var result = await purposeService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<MaterialPurposeDto>.Ok(result, "Cập nhật mục đích sử dụng vật tư thành công."));
    }

    [HasPermission(PermissionCodes.WorkReports.Configure)]
    [HttpPatch("{id:int}/active")]
    public async Task<ActionResult<ApiResponse<MaterialPurposeDto>>> SetActive(
        int id, SetMaterialPurposeActiveRequest request, CancellationToken cancellationToken)
    {
        var result = await purposeService.SetActiveAsync(id, request.IsActive, cancellationToken);
        return Ok(ApiResponse<MaterialPurposeDto>.Ok(result,
            request.IsActive ? "Đã dùng lại mục đích." : "Đã ngừng dùng mục đích."));
    }
}