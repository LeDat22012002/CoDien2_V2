using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Organization.Controllers;

[ApiController]
[Route("api/position-levels")]
public class PositionLevelsController(IPositionLevelService positionLevelService) : ControllerBase
{
    [HasPermission(PermissionCodes.OrgChart.View)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PositionLevelDto>>>> GetList(
        CancellationToken cancellationToken)
    {
        var result = await positionLevelService.GetListAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PositionLevelDto>>.Ok(result));
    }

    /// <summary>Sửa cấp bậc: { name, rank, chartRow (1..6), displayMode (CARD|BLOCK), blockLabel }.</summary>
    [HasPermission(PermissionCodes.OrgUnits.Manage)]
    [HttpPut("{code}")]
    public async Task<ActionResult<ApiResponse<PositionLevelDto>>> Update(
        string code, UpdatePositionLevelRequest request, CancellationToken cancellationToken)
    {
        var result = await positionLevelService.UpdateAsync(code, request, cancellationToken);
        return Ok(ApiResponse<PositionLevelDto>.Ok(result, "Cập nhật cấp bậc thành công."));
    }
}
