using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Báo cáo công việc tuần, phần chung: phạm vi người đăng nhập, gợi ý người thực hiện.
/// Kế hoạch: WorkPlanController (/api/work-reports/plan); báo cáo: WorkReportItemsController (/api/work-reports/report).
/// </summary>
[ApiController]
[Route("api/work-reports")]
[HasPermission(
    PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage, PermissionCodes.WorkReports.Configure,
    PermissionCodes.WorkReports.PlanCreate, PermissionCodes.WorkReports.PlanUpdate, PermissionCodes.WorkReports.PlanDelete,
    PermissionCodes.WorkReports.ReportCreate, PermissionCodes.WorkReports.ReportUpdate,
    PermissionCodes.WorkReports.ReportDelete)]
public class WorkReportsController(
    IWorkReportScopeService scopeService,
    IWorkerOptionService workerOptionService) : ControllerBase
{
    /// <summary>Xưởng / tổ-kíp người đăng nhập được xem, kèm quyền từng đơn vị (để FE ẩn/hiện).</summary>
    [HttpGet("my-scope")]
    public async Task<ActionResult<ApiResponse<MyWorkReportScopeDto>>> GetMyScope(CancellationToken cancellationToken)
    {
        var result = await scopeService.GetMyScopeAsync(cancellationToken);
        return Ok(ApiResponse<MyWorkReportScopeDto>.Ok(result));
    }

    /// <summary>Gợi ý người thực hiện: scope UNIT (tổ/kíp) | TEAM (đội) | WORKSHOP (xưởng).</summary>
    [HttpGet("worker-options")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkerOptionDto>>>> GetWorkerOptions(
        [FromQuery] WorkerOptionFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await workerOptionService.GetWorkerOptionsAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkerOptionDto>>.Ok(result));
    }
}
