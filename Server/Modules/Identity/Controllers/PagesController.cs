using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Identity.Controllers;

[ApiController]
[Route("api/pages")]
[HasPermission(PermissionCodes.Pages.Manage)]
public class PagesController(IPageService pageService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PageDto>>>> GetTree(CancellationToken cancellationToken)
    {
        var result = await pageService.GetTreeAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PageDto>>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PageDto>>> Create(
        CreatePageRequest request, CancellationToken cancellationToken)
    {
        var result = await pageService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<PageDto>.Ok(result, "Thêm trang thành công."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<PageDto>>> Update(
        int id, UpdatePageRequest request, CancellationToken cancellationToken)
    {
        var result = await pageService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<PageDto>.Ok(result, "Cập nhật trang thành công."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await pageService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa trang thành công."));
    }
}
