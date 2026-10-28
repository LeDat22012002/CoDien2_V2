using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Identity.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController(IUserService userService) : ControllerBase
{
    [HasPermission(PermissionCodes.Users.View)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<UserDto>>>> GetPaged(
        [FromQuery] UserFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await userService.GetPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<UserDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.Users.View)]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await userService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<UserDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.Users.Create)]
    [HttpGet("available-employees")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AvailableEmployeeDto>>>> GetAvailableEmployees(
        [FromQuery] string? keyword, CancellationToken cancellationToken)
    {
        var result = await userService.GetAvailableEmployeesAsync(keyword, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AvailableEmployeeDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.Users.Create)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create(
        CreateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await userService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<UserDto>.Ok(result, "Tạo tài khoản thành công."));
    }

    [HasPermission(PermissionCodes.Users.Update)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(
        int id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await userService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<UserDto>.Ok(result, "Cập nhật tài khoản thành công."));
    }

    [HasPermission(PermissionCodes.Users.ResetPassword)]
    [HttpPost("{id:int}/reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword(
        int id, ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await userService.ResetPasswordAsync(id, request, cancellationToken);
        return Ok(ApiResponse.Ok("Đặt lại mật khẩu thành công."));
    }

    [HasPermission(PermissionCodes.Users.Update)]
    [HttpPost("{id:int}/unlock")]
    public async Task<ActionResult<ApiResponse<object>>> Unlock(int id, CancellationToken cancellationToken)
    {
        await userService.UnlockAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Mở khóa tài khoản thành công."));
    }

    [HasPermission(PermissionCodes.Users.Delete)]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await userService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa tài khoản thành công."));
    }
}
