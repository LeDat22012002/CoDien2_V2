using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Organization.Controllers;

[ApiController]
[Route("api/org-chart")]
[HasPermission(PermissionCodes.OrgChart.View)]
public class OrgChartController(IOrgChartService orgChartService) : ControllerBase
{
    /// <summary>Toàn bộ cây sơ đồ trong 1 lần gọi; FE xếp node theo Row và hiện hover từ Heads / Deputies / Blocks.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<OrgChartTreeDto>>> GetTree(CancellationToken cancellationToken)
    {
        var result = await orgChartService.GetTreeAsync(cancellationToken);
        return Ok(ApiResponse<OrgChartTreeDto>.Ok(result));
    }

    [HttpGet("units/{orgUnitId:int}/members")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UnitMemberDto>>>> GetMembers(
        int orgUnitId, CancellationToken cancellationToken)
    {
        var result = await orgChartService.GetMembersAsync(orgUnitId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<UnitMemberDto>>.Ok(result));
    }

    /// <summary>Danh mục cho dropdown: loại đơn vị (kèm loại cha hợp lệ), cấp bậc, chuyên môn.</summary>
    [HttpGet("lookups")]
    public async Task<ActionResult<ApiResponse<LookupsDto>>> GetLookups(CancellationToken cancellationToken)
    {
        var result = await orgChartService.GetLookupsAsync(cancellationToken);
        return Ok(ApiResponse<LookupsDto>.Ok(result));
    }
}
