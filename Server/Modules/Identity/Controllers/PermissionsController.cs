using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Identity.Controllers;

/// <summary>Mã quyền do code định nghĩa: chỉ xem và sửa tên hiển thị, không thêm/xóa.</summary>
[ApiController]
[Route("api/permissions")]
public class PermissionsController(IPermissionService permissionService) : ControllerBase
{
    [HasPermission(PermissionCodes.Roles.View, PermissionCodes.Pages.Manage)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PermissionGroupDto>>>> GetGrouped(
        CancellationToken cancellationToken)
    {
        var result = await permissionService.GetGroupedAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PermissionGroupDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.Roles.Manage)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<PermissionDto>>> Update(
        int id, UpdatePermissionRequest request, CancellationToken cancellationToken)
    {
        var result = await permissionService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<PermissionDto>.Ok(result, "Cập nhật quyền thành công."));
    }
}
