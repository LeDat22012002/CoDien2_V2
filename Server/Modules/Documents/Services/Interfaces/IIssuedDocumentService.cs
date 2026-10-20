using Server.Modules.Documents.DTOs;
using Server.Shared.Models;

namespace Server.Modules.Documents.Services.Interfaces;

public interface IIssuedDocumentService
{
    Task<IssueResultDto> IssueStandardAsync(IssueStandardDocumentRequest request, CancellationToken cancellationToken);

    Task<IssueResultDto> IssueAcceptanceRecordAsync(
        IssueAcceptanceRecordRequest request, CancellationToken cancellationToken);

    Task<IssueResultDto> IssueTechnicalConfirmationAsync(
        IssueTechnicalConfirmationRequest request, CancellationToken cancellationToken);

    Task<IssueResultDto> IssueTechnicalPlanAsync(IssueTechnicalPlanRequest request, CancellationToken cancellationToken);

    Task<IssueResultDto> IssueContractPaymentAsync(
        IssueContractPaymentRequest request, CancellationToken cancellationToken);

    Task<PagedResult<IssuedDocumentDto>> GetPagedAsync(
        IssuedDocumentFilterRequest filter, CancellationToken cancellationToken);

    Task<IReadOnlyList<string>> GetContractNumbersAsync(int templateId, CancellationToken cancellationToken);

    /// <summary>Người lấy số hoặc người có quyền quản lý sổ mới được sửa.</summary>
    Task UpdateAsync(int id, UpdateIssuedDocumentRequest request, CancellationToken cancellationToken);

    /// <summary>Chỉ được xóa số mới nhất của biểu mẫu trong năm.</summary>
    Task DeleteAsync(int id, CancellationToken cancellationToken);

    Task<byte[]> ExportExcelAsync(int? year, CancellationToken cancellationToken);
}
