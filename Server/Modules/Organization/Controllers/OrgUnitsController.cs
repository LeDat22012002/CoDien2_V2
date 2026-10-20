using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Organization.Controllers;

[ApiController]
[Route("api/org-units")]
public class OrgUnitsController(IOrgUnitService orgUnitService) : ControllerBase
{
    [HasPermission(PermissionCodes.OrgChart.View)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<OrgUnitDto>>>> GetList(
        [FromQuery] OrgUnitFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await orgUnitService.GetListAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<OrgUnitDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.OrgChart.View)]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<OrgUnitDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await orgUnitService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<OrgUnitDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.OrgUnits.Manage)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<OrgUnitDto>>> Create(
        CreateOrgUnitRequest request, CancellationToken cancellationToken)
    {
        var result = await orgUnitService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<OrgUnitDto>.Ok(result, "Thêm đơn vị thành công."));
    }

    [HasPermission(PermissionCodes.OrgUnits.Manage)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<OrgUnitDto>>> Update(
        int id, UpdateOrgUnitRequest request, CancellationToken cancellationToken)
    {
        var result = await orgUnitService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<OrgUnitDto>.Ok(result, "Cập nhật đơn vị thành công."));
    }

    /// <summary>Sắp xếp lại thứ tự các đơn vị con: { parentId, orderedIds: [id theo thứ tự mới] }.</summary>
    [HasPermission(PermissionCodes.OrgUnits.Manage)]
    [HttpPut("reorder")]
    public async Task<ActionResult<ApiResponse<object>>> Reorder(
        ReorderOrgUnitsRequest request, CancellationToken cancellationToken)
    {
        await orgUnitService.ReorderAsync(request, cancellationToken);
        return Ok(ApiResponse.Ok("Đã cập nhật thứ tự."));
    }

    [HasPermission(PermissionCodes.OrgUnits.Manage)]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await orgUnitService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa đơn vị thành công."));
    }
}
