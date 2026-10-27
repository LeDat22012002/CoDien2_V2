using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.Documents.Controllers;

/// <summary>
/// Sổ văn bản đã cấp. Có 5 API cấp số tương ứng 5 cách đánh số (như hệ thống cũ);
/// FE chọn API theo biểu mẫu. Người lấy số lấy theo tài khoản đăng nhập. Xem sổ: công khai.
/// </summary>
[ApiController]
[Route("api/issued-documents")]
public class IssuedDocumentsController(IIssuedDocumentService documentService) : ControllerBase
{
    private const string ExcelContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /// <summary>Công khai như hệ thống cũ: trang Lấy số văn bản cho mọi người xem sổ, chỉ lấy số mới cần đăng nhập.</summary>
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<IssuedDocumentDto>>>> GetPaged(
        [FromQuery] IssuedDocumentFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await documentService.GetPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<IssuedDocumentDto>>.Ok(result));
    }

    /// <summary>Các số hợp đồng đã cấp của 1 biểu mẫu (cho biên bản thanh toán theo hợp đồng).</summary>
    [HasPermission(PermissionCodes.Documents.Issue, PermissionCodes.Documents.View)]
    [HttpGet("contract-numbers")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<string>>>> GetContractNumbers(
        [FromQuery] int documentTemplateId, CancellationToken cancellationToken)
    {
        var result = await documentService.GetContractNumbersAsync(documentTemplateId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<string>>.Ok(result));
    }

    [HasPermission(PermissionCodes.Documents.View)]
    [HttpGet("export")]
    public async Task<IActionResult> ExportExcel([FromQuery] int? year, CancellationToken cancellationToken)
    {
        var fileBytes = await documentService.ExportExcelAsync(year, cancellationToken);
        return File(fileBytes, ExcelContentType, $"SoVanBanDaCap_{DateTime.Now:yyyy-MM-dd}.xlsx");
    }

    /// <summary>Văn bản thường: {STT}/{Năm}/{Đuôi số}.</summary>
    [HasPermission(PermissionCodes.Documents.Issue)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<IssueResultDto>>> IssueStandard(
        IssueStandardDocumentRequest request, CancellationToken cancellationToken)
    {
        var result = await documentService.IssueStandardAsync(request, cancellationToken);
        return Ok(ApiResponse<IssueResultDto>.Ok(result, "Cấp số văn bản thành công."));
    }

    /// <summary>Hồ sơ nghiệm thu: {Lần NT}/{Số HĐ}/{Tên viết tắt}.</summary>
    [HasPermission(PermissionCodes.Documents.Issue)]
    [HttpPost("acceptance-records")]
    public async Task<ActionResult<ApiResponse<IssueResultDto>>> IssueAcceptanceRecord(
        IssueAcceptanceRecordRequest request, CancellationToken cancellationToken)
    {
        var result = await documentService.IssueAcceptanceRecordAsync(request, cancellationToken);
        return Ok(ApiResponse<IssueResultDto>.Ok(result, "Cấp số Hồ sơ nghiệm thu thành công."));
    }

    /// <summary>Xác nhận kỹ thuật: XNKT.{STT}-{Năm}/{Số PR}/{Nhà thầu}.</summary>
    [HasPermission(PermissionCodes.Documents.Issue)]
    [HttpPost("technical-confirmations")]
    public async Task<ActionResult<ApiResponse<IssueResultDto>>> IssueTechnicalConfirmation(
        IssueTechnicalConfirmationRequest request, CancellationToken cancellationToken)
    {
        var result = await documentService.IssueTechnicalConfirmationAsync(request, cancellationToken);
        return Ok(ApiResponse<IssueResultDto>.Ok(result, "Cấp số văn bản Xác nhận kỹ thuật thành công."));
    }

    /// <summary>Phương án kỹ thuật: {STT}/{Năm}/PAKT-NM.CĐ2-{Nhà thầu}.</summary>
    [HasPermission(PermissionCodes.Documents.Issue)]
    [HttpPost("technical-plans")]
    public async Task<ActionResult<ApiResponse<IssueResultDto>>> IssueTechnicalPlan(
        IssueTechnicalPlanRequest request, CancellationToken cancellationToken)
    {
        var result = await documentService.IssueTechnicalPlanAsync(request, cancellationToken);
        return Ok(ApiResponse<IssueResultDto>.Ok(result, "Cấp số văn bản Phương án kỹ thuật thành công."));
    }

    /// <summary>Biên bản xác nhận khối lượng thanh toán công đoạn: {STT}/{Số HĐ}/{Năm HĐ}/{Đuôi số}.</summary>
    [HasPermission(PermissionCodes.Documents.Issue)]
    [HttpPost("contract-payments")]
    public async Task<ActionResult<ApiResponse<IssueResultDto>>> IssueContractPayment(
        IssueContractPaymentRequest request, CancellationToken cancellationToken)
    {
        var result = await documentService.IssueContractPaymentAsync(request, cancellationToken);
        return Ok(ApiResponse<IssueResultDto>.Ok(result, "Cấp số văn bản thành công."));
    }

    /// <summary>Sửa trích yếu, ghi chú, trạng thái, link eOffice (người lấy số hoặc người quản lý sổ).</summary>
    [HasPermission(PermissionCodes.Documents.Issue, PermissionCodes.Documents.Manage)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(
        int id, UpdateIssuedDocumentRequest request, CancellationToken cancellationToken)
    {
        await documentService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse.Ok("Cập nhật thành công."));
    }

    /// <summary>Chỉ xóa được số mới nhất của biểu mẫu trong năm.</summary>
    [HasPermission(PermissionCodes.Documents.Manage)]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await documentService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa thành công."));
    }
}
