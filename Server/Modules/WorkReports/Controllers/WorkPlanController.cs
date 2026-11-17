using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Kế hoạch tuần: lưới, tổng hợp, dòng kế hoạch, vật tư kế hoạch, mở khóa.
/// Thêm/sửa/xóa: kỹ sư phụ trách (work-reports.submit) hoặc work-reports.plan.create/update/delete trong phạm vi;
/// chỉ khi kế hoạch còn hạn (hoặc admin đã mở khóa). Phạm vi đơn vị kiểm tra trong Service.
/// </summary>
[ApiController]
[Route("api/work-reports/plan")]
[HasPermission(
    PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage, PermissionCodes.WorkReports.Configure,
    PermissionCodes.WorkReports.PlanCreate, PermissionCodes.WorkReports.PlanUpdate, PermissionCodes.WorkReports.PlanDelete,
    PermissionCodes.WorkReports.ReportCreate, PermissionCodes.WorkReports.ReportUpdate,
    PermissionCodes.WorkReports.ReportDelete, PermissionCodes.WorkReports.AssignEngineers, PermissionCodes.WorkReports.Unlock)]
public class WorkPlanController(
    IWorkPlanService planService,
    IWorkPlanMaterialService materialService,
    IWeeklyFormService formService) : ControllerBase
{
    [HttpGet("grid")]
    public async Task<ActionResult<ApiResponse<WorkGridDto<WeeklyPlanFormDto>>>> GetGrid(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        var result = await planService.GetGridAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkGridDto<WeeklyPlanFormDto>>.Ok(result));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<WorkReportSummaryDto>>> GetSummary(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        var result = await planService.GetSummaryAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportSummaryDto>.Ok(result));
    }

    [HttpGet("materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetWorkshopMaterials(
        [FromQuery] WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await materialService.GetWorkshopMaterialsAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    /// <summary>Mở khóa kế hoạch đã quá hạn tới body.until (null = khóa lại). Quyền unlock, phạm vi theo chức vụ.</summary>
    [HasPermission(PermissionCodes.WorkReports.Unlock)]
    [HttpPost("forms/{formId:int}/unlock")]
    public async Task<ActionResult<ApiResponse<object>>> Unlock(
        int formId, UnlockFormRequest request, CancellationToken cancellationToken)
    {
        await formService.UnlockAsync(formId, WorkReportPhases.Plan, request, cancellationToken);
        return Ok(ApiResponse.Ok(request.Until is null ? "Đã khóa lại kế hoạch." : "Đã mở khóa kế hoạch."));
    }

    // ===== Dòng kế hoạch =====

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.PlanCreate)]
    [HttpPost("forms/{formId:int}/items")]
    public async Task<ActionResult<ApiResponse<WorkPlanItemDto>>> CreateItem(
        int formId, PlanItemRequest request, CancellationToken cancellationToken)
    {
        var result = await planService.CreateAsync(formId, request, cancellationToken);
        return Ok(ApiResponse<WorkPlanItemDto>.Ok(result, "Đã thêm dòng kế hoạch."));
    }

    /// <summary>Body có rowVersion. Người khác vừa sửa → 409 kèm dòng mới nhất trong data.</summary>
    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.PlanUpdate)]
    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkPlanItemDto>>> UpdateItem(
        int id, UpdatePlanItemRequest request, CancellationToken cancellationToken)
    {
        var result = await planService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkPlanItemDto>.Ok(result, "Đã lưu dòng kế hoạch."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.PlanDelete)]
    [HttpDelete("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteItem(int id, CancellationToken cancellationToken)
    {
        await planService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Đã xóa dòng kế hoạch."));
    }

    // ===== Vật tư kế hoạch =====

    [HttpGet("forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetFormMaterials(
        int formId, CancellationToken cancellationToken)
    {
        var result = await materialService.GetByFormAsync(formId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.PlanCreate)]
    [HttpPost("forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<WorkMaterialDto>>> CreateMaterial(
        int formId, CreateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var result = await materialService.CreateAsync(formId, request, cancellationToken);
        return Ok(ApiResponse<WorkMaterialDto>.Ok(result, "Đã thêm vật tư."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.PlanUpdate)]
    [HttpPut("materials/{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkMaterialDto>>> UpdateMaterial(
        int id, UpdateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var result = await materialService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkMaterialDto>.Ok(result, "Đã lưu vật tư."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.PlanDelete)]
    [HttpDelete("materials/{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteMaterial(int id, CancellationToken cancellationToken)
    {
        await materialService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Đã xóa vật tư."));
    }
}
