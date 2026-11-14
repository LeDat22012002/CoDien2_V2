using Microsoft.AspNetCore.Mvc;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>Báo cáo công việc tuần. GĐ 1: phạm vi của người đăng nhập; GĐ 2 bổ sung lưới nhập, tổng hợp, vật tư, xuất Excel.</summary>
[ApiController]
[Route("api/work-reports")]
public class WorkReportsController(IWorkReportScopeService scopeService) : ControllerBase
{
    /// <summary>Xưởng / tổ-kíp người đăng nhập được xem, kèm quyền từng đơn vị (để FE ẩn/hiện).</summary>
    [HttpGet("my-scope")]
    public async Task<ActionResult<ApiResponse<MyWorkReportScopeDto>>> GetMyScope(CancellationToken cancellationToken)
    {
        var result = await scopeService.GetMyScopeAsync(cancellationToken);
        return Ok(ApiResponse<MyWorkReportScopeDto>.Ok(result));
    }
}