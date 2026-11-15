using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Báo cáo công việc tuần: phạm vi, lưới công việc, dòng công việc, vật tư, tổng hợp.
/// Xem: một trong các quyền work-reports.*; nhập/sửa: work-reports.submit (kỹ sư) hoặc manage (đội trưởng, quản đốc).
/// Phạm vi đơn vị và trạng thái khóa kiểm tra trong Service. Thao tác ghi truyền ?phase=PLAN|REPORT.
/// </summary>
[ApiController]
[Route("api/work-reports")]
[HasPermission(
    PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage,
    PermissionCodes.WorkReports.Configure)]
public class WorkReportsController(
    IWorkReportScopeService scopeService,
    IWeeklyFormService formService,
    IWorkItemService itemService,
    IWorkMaterialService materialService) : ControllerBase
{
    /// <summary>Xưởng / tổ-kíp người đăng nhập được xem, kèm quyền từng đơn vị (để FE ẩn/hiện).</summary>
    [HttpGet("my-scope")]
    public async Task<ActionResult<ApiResponse<MyWorkReportScopeDto>>> GetMyScope(CancellationToken cancellationToken)
    {
        var result = await scopeService.GetMyScopeAsync(cancellationToken);
        return Ok(ApiResponse<MyWorkReportScopeDto>.Ok(result));
    }

    // ===== Lưới, tổng hợp, vật tư xưởng =====

    /// <summary>Bảng công việc của xưởng trong tuần (tự tạo form còn thiếu của tuần đang làm việc).</summary>
    [HttpGet("grid")]
    public async Task<ActionResult<ApiResponse<WorkReportGridDto>>> GetGrid(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        var result = await formService.GetGridAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportGridDto>.Ok(result));
    }

    /// <summary>Tổng hợp: mỗi đơn vị 1 dòng (phút theo đầu mục, tổng, nhân lực quy đổi, số đầu mã vật tư).</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<WorkReportSummaryDto>>> GetSummary(
        [FromQuery] WorkReportGridRequest request, CancellationToken cancellationToken)
    {
        var result = await formService.GetSummaryAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportSummaryDto>.Ok(result));
    }

    [HttpGet("materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetWorkshopMaterials(
        [FromQuery] WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await materialService.GetWorkshopMaterialsAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    /// <summary>Gợi ý người thực hiện: scope UNIT (tổ/kíp) | TEAM (đội) | WORKSHOP (xưởng).</summary>
    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage)]
    [HttpGet("worker-options")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkerOptionDto>>>> GetWorkerOptions(
        [FromQuery] WorkerOptionFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await itemService.GetWorkerOptionsAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkerOptionDto>>.Ok(result));
    }

    // ===== Dòng công việc =====

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage)]
    [HttpPost("forms/{formId:int}/items")]
    public async Task<ActionResult<ApiResponse<WorkItemDto>>> CreateItem(
        int formId, [FromQuery] string phase, CreateWorkItemRequest request, CancellationToken cancellationToken)
    {
        var result = await itemService.CreateAsync(formId, phase, request, cancellationToken);
        return Ok(ApiResponse<WorkItemDto>.Ok(result, "Đã thêm dòng công việc."));
    }

    /// <summary>Dán từ Excel: lưu dòng hợp lệ, trả lỗi theo cột cho dòng sai.</summary>
    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage)]
    [HttpPost("forms/{formId:int}/items/batch")]
    public async Task<ActionResult<ApiResponse<BatchCreateWorkItemsResultDto>>> BatchCreateItems(
        int formId, [FromQuery] string phase, BatchCreateWorkItemsRequest request, CancellationToken cancellationToken)
    {
        var result = await itemService.BatchCreateAsync(formId, phase, request, cancellationToken);
        var message = result.Errors.Count == 0
            ? $"Đã thêm {result.Created.Count} dòng."
            : $"Đã thêm {result.Created.Count} dòng, {result.Errors.Count} dòng lỗi cần sửa.";
        return Ok(ApiResponse<BatchCreateWorkItemsResultDto>.Ok(result, message));
    }

    /// <summary>Sửa dòng; body có rowVersion. Người khác vừa sửa → 409 kèm dòng mới nhất trong data.</summary>
    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage)]
    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkItemDto>>> UpdateItem(
        int id, [FromQuery] string phase, UpdateWorkItemRequest request, CancellationToken cancellationToken)
    {
        var result = await itemService.UpdateAsync(id, phase, request, cancellationToken);
        return Ok(ApiResponse<WorkItemDto>.Ok(result, "Đã lưu dòng công việc."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage)]
    [HttpDelete("items/{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteItem(
        int id, [FromQuery] string phase, CancellationToken cancellationToken)
    {
        await itemService.DeleteAsync(id, phase, cancellationToken);
        return Ok(ApiResponse.Ok("Đã xóa dòng công việc."));
    }

    // ===== Vật tư của form =====

    [HttpGet("forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkMaterialDto>>>> GetFormMaterials(
        int formId, [FromQuery] string phase, CancellationToken cancellationToken)
    {
        var result = await materialService.GetByFormAsync(formId, phase, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkMaterialDto>>.Ok(result));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage)]
    [HttpPost("forms/{formId:int}/materials")]
    public async Task<ActionResult<ApiResponse<WorkMaterialDto>>> CreateMaterial(
        int formId, [FromQuery] string phase, CreateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var result = await materialService.CreateAsync(formId, phase, request, cancellationToken);
        return Ok(ApiResponse<WorkMaterialDto>.Ok(result, "Đã thêm vật tư."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage)]
    [HttpPut("materials/{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkMaterialDto>>> UpdateMaterial(
        int id, [FromQuery] string phase, UpdateWorkMaterialRequest request, CancellationToken cancellationToken)
    {
        var result = await materialService.UpdateAsync(id, phase, request, cancellationToken);
        return Ok(ApiResponse<WorkMaterialDto>.Ok(result, "Đã lưu vật tư."));
    }

    [HasPermission(PermissionCodes.WorkReports.Submit, PermissionCodes.WorkReports.Manage)]
    [HttpDelete("materials/{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteMaterial(
        int id, [FromQuery] string phase, CancellationToken cancellationToken)
    {
        await materialService.DeleteAsync(id, phase, cancellationToken);
        return Ok(ApiResponse.Ok("Đã xóa vật tư."));
    }
}
