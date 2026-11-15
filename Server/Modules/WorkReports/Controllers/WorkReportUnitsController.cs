using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Đơn vị báo cáo (tổ/kíp) và kỹ sư phụ trách (trang Quản lý báo cáo tuần): work-reports.manage hoặc configure;
/// phạm vi kiểm tra trong Service: cấu hình đơn vị = admin / quản đốc-phó của xưởng;
/// phân công kỹ sư = tổ HC: + đội trưởng/phó; kíp: chỉ quản đốc/phó.
/// </summary>
[ApiController]
[Route("api/work-report-units")]
[HasPermission(PermissionCodes.WorkReports.Manage, PermissionCodes.WorkReports.Configure)]
public class WorkReportUnitsController(
    IWorkReportUnitService unitService,
    IWorkReportUnitEngineerService engineerService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkReportUnitDto>>>> GetList(
        [FromQuery] WorkReportUnitFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await unitService.GetListAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkReportUnitDto>>.Ok(result));
    }

    /// <summary>Đơn vị đã xóa của xưởng (để khôi phục).</summary>
    [HttpGet("deleted")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkReportUnitDto>>>> GetDeleted(
        [FromQuery] int workshopId, CancellationToken cancellationToken)
    {
        var result = await unitService.GetDeletedAsync(workshopId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkReportUnitDto>>.Ok(result));
    }

    /// <summary>Xưởng và các đội trong xưởng: chỗ gắn đơn vị tự đặt.</summary>
    [HttpGet("parent-options")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkReportUnitParentOptionDto>>>> GetParentOptions(
        [FromQuery] int workshopId, CancellationToken cancellationToken)
    {
        var result = await unitService.GetParentOptionsAsync(workshopId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkReportUnitParentOptionDto>>.Ok(result));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkReportUnitDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await unitService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<WorkReportUnitDto>.Ok(result));
    }

    /// <summary>Thêm đơn vị tự đặt (tổ/kíp trên sơ đồ được tạo tự động).</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<WorkReportUnitDto>>> Create(
        CreateWorkReportUnitRequest request, CancellationToken cancellationToken)
    {
        var result = await unitService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<WorkReportUnitDto>.Ok(result, "Thêm đơn vị báo cáo thành công."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkReportUnitDto>>> Update(
        int id, UpdateWorkReportUnitRequest request, CancellationToken cancellationToken)
    {
        var result = await unitService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkReportUnitDto>.Ok(result, "Cập nhật đơn vị báo cáo thành công."));
    }

    /// <summary>Xóa đơn vị chưa có dữ liệu (đã có kế hoạch/báo cáo → 400, chỉ ngừng dùng được).</summary>
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await unitService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Đã xóa đơn vị báo cáo."));
    }

    [HttpPost("{id:int}/restore")]
    public async Task<ActionResult<ApiResponse<WorkReportUnitDto>>> Restore(int id, CancellationToken cancellationToken)
    {
        var result = await unitService.RestoreAsync(id, cancellationToken);
        return Ok(ApiResponse<WorkReportUnitDto>.Ok(result, "Đã khôi phục đơn vị báo cáo."));
    }

    [HttpPut("reorder")]
    public async Task<ActionResult<ApiResponse<object>>> Reorder(
        ReorderWorkReportUnitsRequest request, CancellationToken cancellationToken)
    {
        await unitService.ReorderAsync(request, cancellationToken);
        return Ok(ApiResponse.Ok("Đã lưu thứ tự đơn vị báo cáo."));
    }

    // ===== Kỹ sư phụ trách =====

    [HttpGet("{id:int}/engineers")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkReportUnitEngineerDto>>>> GetEngineers(
        int id, CancellationToken cancellationToken)
    {
        var result = await engineerService.GetEngineersAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkReportUnitEngineerDto>>.Ok(result));
    }

    /// <summary>Lưu cả danh sách kỹ sư phụ trách (xác nhận phân công).</summary>
    [HttpPut("{id:int}/engineers")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkReportUnitEngineerDto>>>> SetEngineers(
        int id, SetUnitEngineersRequest request, CancellationToken cancellationToken)
    {
        var result = await engineerService.SetEngineersAsync(id, request, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkReportUnitEngineerDto>>.Ok(result, "Đã lưu kỹ sư phụ trách."));
    }

    /// <summary>Kỹ sư trên sơ đồ tổ chức ở tổ/kíp và đội chứa tổ, để chọn nhanh.</summary>
    [HttpGet("{id:int}/engineer-suggestions")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EngineerSuggestionDto>>>> GetEngineerSuggestions(
        int id, CancellationToken cancellationToken)
    {
        var result = await engineerService.GetSuggestionsAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<EngineerSuggestionDto>>.Ok(result));
    }
}