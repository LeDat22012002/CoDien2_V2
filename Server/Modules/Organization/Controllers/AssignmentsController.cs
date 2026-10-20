using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Organization.Controllers;

[ApiController]
[Route("api/assignments")]
public class AssignmentsController(IAssignmentService assignmentService) : ControllerBase
{
    /// <summary>Đổi chức vụ / điều chuyển / bổ nhiệm / giao quyền.</summary>
    [HasPermission(PermissionCodes.Assignments.Manage)]
    [HttpPost("change")]
    public async Task<ActionResult<ApiResponse<object>>> Change(
        ChangeAssignmentRequest request, CancellationToken cancellationToken)
    {
        await assignmentService.ChangeAsync(request, cancellationToken);
        return Ok(ApiResponse.Ok("Cập nhật chức vụ thành công."));
    }

    /// <summary>Thôi giữ 1 vị trí.</summary>
    [HasPermission(PermissionCodes.Assignments.Manage)]
    [HttpPost("{id:int}/end")]
    public async Task<ActionResult<ApiResponse<object>>> End(
        int id, EndAssignmentRequest request, CancellationToken cancellationToken)
    {
        await assignmentService.EndAsync(id, request, cancellationToken);
        return Ok(ApiResponse.Ok("Đã kết thúc vị trí."));
    }

    [HasPermission(PermissionCodes.Assignments.View, PermissionCodes.Assignments.Manage)]
    [HttpGet("history/{empCode}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AssignmentHistoryDto>>>> GetHistory(
        string empCode, CancellationToken cancellationToken)
    {
        var result = await assignmentService.GetHistoryAsync(empCode, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AssignmentHistoryDto>>.Ok(result));
    }
}
