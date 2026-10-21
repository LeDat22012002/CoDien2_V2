using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Incidents.DTOs;
using Server.Modules.Incidents.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Helpers;
using Server.Shared.Models;

namespace Server.Modules.Incidents.Controllers;

/// <summary>
/// Báo cáo sự cố. Xem danh sách / chi tiết / dashboard: công khai. Tạo: mọi người đăng nhập.
/// Phạm vi sửa tiến độ / phân tích / bổ sung kiểm tra trong service theo người nhập và xưởng.
/// </summary>
[ApiController]
[Route("api/incidents")]
public class IncidentsController(
    IIncidentService incidentService,
    IIncidentDashboardService dashboardService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<IncidentDto>>>> GetPaged(
        [FromQuery] IncidentFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await incidentService.GetPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<IncidentDto>>.Ok(result));
    }

    /// <summary>Toàn nhà máy (kèm thống kê theo xưởng) hoặc 1 xưởng: ?year=2026&amp;workshopId=5.</summary>
    [AllowAnonymous]
    [HttpGet("dashboard")]
    public async Task<ActionResult<ApiResponse<IncidentDashboardDto>>> GetDashboard(
        [FromQuery] IncidentDashboardFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await dashboardService.GetDashboardAsync(filter, cancellationToken);
        return Ok(ApiResponse<IncidentDashboardDto>.Ok(result));
    }

    /// <summary>Mã thiết bị có số sự cố trong năm vượt ngưỡng (mặc định &gt; 3 lần).</summary>
    [AllowAnonymous]
    [HttpGet("repeated-equipment")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RepeatedEquipmentDto>>>> GetRepeatedEquipment(
        [FromQuery] RepeatedEquipmentFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await dashboardService.GetRepeatedEquipmentAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RepeatedEquipmentDto>>.Ok(result));
    }

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<IncidentDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await incidentService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<IncidentDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<IncidentDto>>> Create(
        CreateIncidentRequest request, CancellationToken cancellationToken)
    {
        var result = await incidentService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<IncidentDto>.Ok(result, "Thêm báo cáo sự cố thành công."));
    }

    [HasPermission(PermissionCodes.Incidents.Manage)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<IncidentDto>>> Update(
        int id, UpdateIncidentRequest request, CancellationToken cancellationToken)
    {
        var result = await incidentService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<IncidentDto>.Ok(result, "Cập nhật báo cáo sự cố thành công."));
    }

    /// <summary>Mốc thời gian, mô tả, phương án xử lý (người nhập hoặc quản lý).</summary>
    [HttpPut("{id:int}/progress")]
    public async Task<ActionResult<ApiResponse<IncidentDto>>> UpdateProgress(
        int id, UpdateIncidentProgressRequest request, CancellationToken cancellationToken)
    {
        var result = await incidentService.UpdateProgressAsync(id, request, cancellationToken);
        return Ok(ApiResponse<IncidentDto>.Ok(result, "Cập nhật tiến độ xử lý thành công."));
    }

    [HasPermission(PermissionCodes.Incidents.Analyze, PermissionCodes.Incidents.Manage)]
    [HttpPut("{id:int}/analysis")]
    public async Task<ActionResult<ApiResponse<IncidentDto>>> UpdateAnalysis(
        int id, UpdateIncidentAnalysisRequest request, CancellationToken cancellationToken)
    {
        var result = await incidentService.UpdateAnalysisAsync(id, request, cancellationToken);
        return Ok(ApiResponse<IncidentDto>.Ok(result, "Cập nhật phân tích thành công."));
    }

    /// <summary>Số order, link biên bản (người nhập, phân tích của xưởng hoặc quản lý).</summary>
    [HttpPut("{id:int}/supplement")]
    public async Task<ActionResult<ApiResponse<IncidentDto>>> UpdateSupplement(
        int id, UpdateIncidentSupplementRequest request, CancellationToken cancellationToken)
    {
        var result = await incidentService.UpdateSupplementAsync(id, request, cancellationToken);
        return Ok(ApiResponse<IncidentDto>.Ok(result, "Bổ sung thông tin thành công."));
    }

    [HasPermission(PermissionCodes.Incidents.Manage)]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await incidentService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa báo cáo sự cố thành công."));
    }

    /// <summary>configs: JSON mảng cấu hình sheet (sheetName, workshopId, startRow, cột…).</summary>
    [HasPermission(PermissionCodes.Incidents.Manage)]
    [HttpPost("import")]
    [RequestSizeLimit(ExcelCellReader.MaxFileSize)]
    public async Task<ActionResult<ApiResponse<IncidentImportResultDto>>> ImportExcel(
        IFormFile file, [FromForm] string configs, CancellationToken cancellationToken)
    {
        var sheetConfigs = JsonFormParser.ParseList<IncidentImportSheetConfig>(configs, "Cấu hình sheet");
        var result = await incidentService.ImportExcelAsync(file, sheetConfigs, cancellationToken);

        var message = result.InsertedCount > 0
            ? $"Nhập thành công! Thêm mới {result.InsertedCount} báo cáo."
            : "Không có dòng dữ liệu hợp lệ nào được nhập.";
        return Ok(ApiResponse<IncidentImportResultDto>.Ok(result, message));
    }
}
