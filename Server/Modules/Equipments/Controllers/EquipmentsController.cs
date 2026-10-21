using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Equipments.DTOs;
using Server.Modules.Equipments.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Helpers;
using Server.Shared.Models;

namespace Server.Modules.Equipments.Controllers;

/// <summary>Danh mục thiết bị. Xem: chỉ cần đăng nhập (người báo cáo sự cố chọn thiết bị); thêm/sửa/xóa/import: quản lý danh mục.</summary>
[ApiController]
[Route("api/equipments")]
public class EquipmentsController(IEquipmentService equipmentService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<EquipmentDto>>>> GetPaged(
        [FromQuery] EquipmentFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await equipmentService.GetPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<EquipmentDto>>.Ok(result));
    }

    /// <summary>Danh sách chọn thiết bị (tối đa 50 dòng) theo mã hoặc tên.</summary>
    [HttpGet("options")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<EquipmentDto>>>> GetOptions(
        [FromQuery] string? keyword, CancellationToken cancellationToken)
    {
        var result = await equipmentService.GetOptionsAsync(keyword, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<EquipmentDto>>.Ok(result));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<EquipmentDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await equipmentService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EquipmentDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.Equipments.Manage)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<EquipmentDto>>> Create(
        CreateEquipmentRequest request, CancellationToken cancellationToken)
    {
        var result = await equipmentService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<EquipmentDto>.Ok(result, "Thêm thiết bị thành công."));
    }

    [HasPermission(PermissionCodes.Equipments.Manage)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<EquipmentDto>>> Update(
        int id, UpdateEquipmentRequest request, CancellationToken cancellationToken)
    {
        var result = await equipmentService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<EquipmentDto>.Ok(result, "Cập nhật thiết bị thành công."));
    }

    [HasPermission(PermissionCodes.Equipments.Manage)]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await equipmentService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa thiết bị thành công."));
    }

    /// <summary>configs: JSON mảng [{ sheetName, startRow, codeColumn, nameColumn }].</summary>
    [HasPermission(PermissionCodes.Equipments.Manage)]
    [HttpPost("import")]
    [RequestSizeLimit(ExcelCellReader.MaxFileSize)]
    public async Task<ActionResult<ApiResponse<EquipmentImportResultDto>>> ImportExcel(
        IFormFile file, [FromForm] string configs, CancellationToken cancellationToken)
    {
        var sheetConfigs = JsonFormParser.ParseList<EquipmentImportSheetConfig>(configs, "Cấu hình sheet");
        var result = await equipmentService.ImportExcelAsync(file, sheetConfigs, cancellationToken);
        return Ok(ApiResponse<EquipmentImportResultDto>.Ok(result, GetImportMessage(result)));
    }

    /// <summary>Import file danh mục gốc theo 4 sheet "THAM CHIẾU EQ" cố định.</summary>
    [HasPermission(PermissionCodes.Equipments.Manage)]
    [HttpPost("import-default")]
    [RequestSizeLimit(ExcelCellReader.MaxFileSize)]
    public async Task<ActionResult<ApiResponse<EquipmentImportResultDto>>> ImportDefaultExcel(
        IFormFile file, CancellationToken cancellationToken)
    {
        var result = await equipmentService.ImportDefaultExcelAsync(file, cancellationToken);
        return Ok(ApiResponse<EquipmentImportResultDto>.Ok(result, GetImportMessage(result)));
    }

    private static string GetImportMessage(EquipmentImportResultDto result) =>
        $"Nhập thành công! Thêm mới {result.InsertedCount}, bỏ qua {result.SkippedCount} mã đã có.";
}
