using Microsoft.AspNetCore.Mvc;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Đơn vị báo cáo (tổ/kíp) và kỹ sư phụ trách. Chỉ cần đăng nhập; quyền theo phạm vi kiểm tra trong Service:
/// cấu hình đơn vị = admin / quản đốc-phó của xưởng; phân công kỹ sư = tổ HC: + đội trưởng/phó; kíp: chỉ quản đốc/phó.
/// </summary>
[ApiController]
[Route("api/work-report-units")]
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

    /// <summary>Tổ/kíp của xưởng chưa có đơn vị báo cáo, kèm gợi ý tiền tố / loại giờ công.</summary>
    [HttpGet("unconfigured")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UnconfiguredOrgUnitDto>>>> GetUnconfigured(
        [FromQuery] int workshopId, CancellationToken cancellationToken)
    {
        var result = await unitService.GetUnconfiguredAsync(workshopId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<UnconfiguredOrgUnitDto>>.Ok(result));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkReportUnitDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await unitService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<WorkReportUnitDto>.Ok(result));
    }

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