using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Trang công khai /work-reports (Ban Giám đốc xem, ai cũng xem được, không cần đăng nhập): chỉ đọc, mọi xưởng.
/// Mọi action gọi UsePublicView trước để phạm vi không phụ thuộc người đăng nhập (form trả canEditNow = false).
/// </summary>
[ApiController]
[Route("api/work-reports/public")]
[AllowAnonymous]
public class PublicWorkReportsController(
    IWorkReportScopeService scopeService,
    IWeeklyFormService formService,
    IWorkMaterialService materialService,
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

    [HttpGet("grid")]
    public async Task<ActionResult<ApiResponse<WorkReportGridDto>>> GetGrid(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await formService.GetGridAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportGridDto>.Ok(result));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<WorkReportSummaryDto>>> GetSummary(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await formService.GetSummaryAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportSummaryDto>.Ok(result));
    }

    [HttpGet("materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetWorkshopMaterials(
        [FromQuery] WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await materialService.GetWorkshopMaterialsAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    [HttpGet("forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetFormMaterials(
        int formId, [FromQuery] string phase, CancellationToken cancellationToken)
    {
        scopeService.UsePublicView();
        var result = await materialService.GetByFormAsync(formId, phase, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }
}
