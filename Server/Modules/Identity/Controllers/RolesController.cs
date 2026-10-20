using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Identity.Controllers;

[ApiController]
[Route("api/roles")]
public class RolesController(IRoleService roleService) : ControllerBase
{
    /// <summary>Người quản lý tài khoản cũng cần danh sách role để chọn khi tạo/sửa tài khoản.</summary>
    [HasPermission(PermissionCodes.Roles.View, PermissionCodes.Users.View)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RoleDto>>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await roleService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RoleDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.Roles.View)]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await roleService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<RoleDetailDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.Roles.Manage)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> Create(
        CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var result = await roleService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<RoleDetailDto>.Ok(result, "Thêm vai trò thành công."));
    }

    [HasPermission(PermissionCodes.Roles.Manage)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<RoleDetailDto>>> Update(
        int id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        var result = await roleService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<RoleDetailDto>.Ok(result, "Cập nhật vai trò thành công."));
    }

    [HasPermission(PermissionCodes.Roles.Manage)]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await roleService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa vai trò thành công."));
    }
}
