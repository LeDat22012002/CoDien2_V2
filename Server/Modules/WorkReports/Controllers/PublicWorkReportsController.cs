using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Trang công khai /work-reports (Ban Giám đốc xem, ai cũng xem được, không cần đăng nhập): chỉ đọc, mọi xưởng.
/// Mọi action gọi UsePublicView trước để phạm vi không phụ thuộc người đăng nhập (form trả canCreate/Update/Delete = false,
/// báo cáo không kèm gợi ý từ kế hoạch). Kế hoạch: /plan/*, báo cáo: /report/*.
/// </summary>
[ApiController]
[Route("api/work-reports/public")]
[AllowAnonymous]
public class PublicWorkReportsController(
    IWorkReportScopeService scopeService,
    IWorkPlanService planService,
    IWorkReportService reportService,
    IWorkPlanMaterialService planMaterialService,
    IWorkReportMaterialService reportMaterialService,
    IWorkWeekService weekService) : ControllerBase
{
    /// <summary>Các xưởng có đơn vị báo cáo (bộ chọn xưởng).</summary>
    [HttpGet("scope")]
    public async Task<ActionResult<ApiResponse<MyWorkReportScopeDto>>> GetScope(CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await scopeService.GetMyScopeAsync(cancellationToken);
        return Ok(ApiResponse<MyWorkReportScopeDto>.Ok(result));
    }

    [HttpGet("weeks")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkWeekDto>>>> GetWeeks(
        [FromQuery] WorkWeekFilterRequest filter, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await weekService.GetListAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkWeekDto>>.Ok(result));
    }

    [HttpGet("weeks/current")]
    public async Task<ActionResult<ApiResponse<WorkingWeeksDto>>> GetWorkingWeeks(
        [FromQuery] int? workshopId, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await weekService.GetWorkingWeeksAsync(workshopId, cancellationToken);
        return Ok(ApiResponse<WorkingWeeksDto>.Ok(result));
    }

    // ===== Kế hoạch =====

    [HttpGet("plan/grid")]
    public async Task<ActionResult<ApiResponse<WorkGridDto<WeeklyPlanFormDto>>>> GetPlanGrid(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await planService.GetGridAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkGridDto<WeeklyPlanFormDto>>.Ok(result));
    }

    [HttpGet("plan/summary")]
    public async Task<ActionResult<ApiResponse<WorkReportSummaryDto>>> GetPlanSummary(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await planService.GetSummaryAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportSummaryDto>.Ok(result));
    }

    [HttpGet("plan/materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetPlanMaterials(
        [FromQuery] WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await planMaterialService.GetWorkshopMaterialsAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    [HttpGet("plan/forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetPlanFormMaterials(
        int formId, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await planMaterialService.GetByFormAsync(formId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    // ===== Báo cáo =====

    [HttpGet("report/grid")]
    public async Task<ActionResult<ApiResponse<WorkGridDto<WeeklyReportFormDto>>>> GetReportGrid(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await reportService.GetGridAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkGridDto<WeeklyReportFormDto>>.Ok(result));
    }

    [HttpGet("report/summary")]
    public async Task<ActionResult<ApiResponse<WorkReportSummaryDto>>> GetReportSummary(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await reportService.GetSummaryAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportSummaryDto>.Ok(result));
    }

    [HttpGet("report/materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetReportMaterials(
        [FromQuery] WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await reportMaterialService.GetWorkshopMaterialsAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    [HttpGet("report/forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetReportFormMaterials(
        int formId, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await reportMaterialService.GetByFormAsync(formId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }
}
