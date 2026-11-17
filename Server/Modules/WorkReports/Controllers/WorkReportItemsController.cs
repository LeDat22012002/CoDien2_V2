using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Báo cáo tuần: lưới (kèm gợi ý từ kế hoạch cho người nhập), tổng hợp, dòng báo cáo, vật tư báo cáo, mở khóa.
/// Thêm/sửa/xóa: kỹ sư phụ trách (work-reports.submit) hoặc work-reports.report.create/update/delete trong phạm vi;
/// chỉ khi báo cáo đang mở (hoặc admin đã mở khóa). Phạm vi đơn vị kiểm tra trong Service.
/// </summary>
[ApiController]
[Route("api/work-reports/report")]
[HasPermission(
    PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage, PermissionCodes.WorkReports.Configure,
    PermissionCodes.WorkReports.PlanCreate, PermissionCodes.WorkReports.PlanUpdate, PermissionCodes.WorkReports.PlanDelete,
    PermissionCodes.WorkReports.ReportCreate, PermissionCodes.WorkReports.ReportUpdate,
    PermissionCodes.WorkReports.ReportDelete, PermissionCodes.WorkReports.AssignEngineers, PermissionCodes.WorkReports.Unlock)]
public class WorkReportItemsController(
    IWorkReportService reportService,
    IWorkReportMaterialService materialService,
    IWeeklyFormService formService) : ControllerBase
{
    [HttpGet("grid")]
    public async Task<ActionResult<ApiResponse<WorkGridDto<WeeklyReportFormDto>>>> GetGrid(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        var result = await reportService.GetGridAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkGridDto<WeeklyReportFormDto>>.Ok(result));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<WorkReportSummaryDto>>> GetSummary(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        var result = await reportService.GetSummaryAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportSummaryDto>.Ok(result));
    }

    [HttpGet("materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetWorkshopMaterials(
        [FromQuery] WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await materialService.GetWorkshopMaterialsAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    /// <summary>Mở khóa báo cáo đã quá hạn tới body.until (null = khóa lại). Quyền unlock, phạm vi theo chức vụ.</summary>
    [HasPermission(PermissionCodes.WorkReports.Unlock)]
    [HttpPost("forms/{formId:int}/unlock")]
    public async Task<ActionResult<ApiResponse<object>>> Unlock(
        int formId, UnlockFormRequest request, CancellationToken cancellationToken)
    {
        await formService.UnlockAsync(formId, WorkReportPhases.Report, request, cancellationToken);
        return Ok(ApiResponse.Ok(request.Until is null ? "Đã khóa lại báo cáo." : "Đã mở khóa báo cáo."));
    }

    // ===== Dòng báo cáo =====

    /// <summary>Thêm việc phát sinh (không có trong kế hoạch).</summary>
    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.ReportCreate)]
    [HttpPost("forms/{formId:int}/items")]
    public async Task<ActionResult<ApiResponse<WorkReportItemDto>>> CreateItem(
        int formId, ReportItemRequest request, CancellationToken cancellationToken)
    {
        var result = await reportService.CreateAsync(formId, request, cancellationToken);
        return Ok(ApiResponse<WorkReportItemDto>.Ok(result, "Đã thêm dòng báo cáo."));
    }

    /// <summary>Đưa dòng kế hoạch (gợi ý) vào báo cáo: giữ mã công việc, chép người thực hiện và vật tư kế hoạch.</summary>
    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.ReportCreate)]
    [HttpPost("forms/{formId:int}/items/from-plan")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkReportItemDto>>>> AcceptPlanItems(
        int formId, AcceptPlanItemsRequest request, CancellationToken cancellationToken)
    {
        var result = await reportService.AcceptPlanItemsAsync(formId, request, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkReportItemDto>>.Ok(
            result, $"Đã đưa {result.Count} dòng kế hoạch vào báo cáo."));
    }

    /// <summary>Body có rowVersion. Người khác vừa sửa → 409 kèm dòng mới nhất trong data.</summary>
    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.ReportUpdate)]
    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkReportItemDto>>> UpdateItem(
        int id, UpdateReportItemRequest request, CancellationToken cancellationToken)
    {
        var result = await reportService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkReportItemDto>.Ok(result, "Đã lưu dòng báo cáo."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.ReportDelete)]
    [HttpDelete("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteItem(int id, CancellationToken cancellationToken)
    {
        await reportService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Đã xóa dòng báo cáo."));
    }

    // ===== Vật tư báo cáo =====

    [HttpGet("forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetFormMaterials(
        int formId, CancellationToken cancellationToken)
    {
        var result = await materialService.GetByFormAsync(formId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.ReportCreate)]
    [HttpPost("forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<WorkMaterialDto>>> CreateMaterial(
        int formId, CreateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var result = await materialService.CreateAsync(formId, request, cancellationToken);
        return Ok(ApiResponse<WorkMaterialDto>.Ok(result, "Đã thêm vật tư."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.ReportUpdate)]
    [HttpPut("materials/{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkMaterialDto>>> UpdateMaterial(
        int id, UpdateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var result = await materialService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkMaterialDto>.Ok(result, "Đã lưu vật tư."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.ReportDelete)]
    [HttpDelete("materials/{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteMaterial(int id, CancellationToken cancellationToken)
    {
        await materialService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Đã xóa vật tư."));
    }
}
