using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Entities;
using Server.Modules.Employees.Entities;

namespace Server.Modules.Documents.Repositories.Interfaces;

/// <summary>
/// Các hàm "...WithLockAsync" khóa dòng (UPDLOCK, HOLDLOCK) tới hết transaction:
/// phải gọi trong IUnitOfWork.ExecuteInTransactionAsync để 2 người cấp số cùng lúc không nhận trùng số.
/// </summary>
public interface IIssuedDocumentRepository
{
    Task<(IReadOnlyList<IssuedDocumentDto> Items, int TotalCount)> GetPagedAsync(
        IssuedDocumentFilterRequest filter, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật / xóa.</summary>
    Task<IssuedDocument?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Số thứ tự lớn nhất của biểu mẫu trong năm (null = chưa có số nào).</summary>
    Task<int?> GetMaxSequenceWithLockAsync(int templateId, int year, CancellationToken cancellationToken);

    /// <summary>Số hiệu mọi văn bản kết thúc bằng chuỗi chỉ định (hồ sơ nghiệm thu).</summary>
    Task<IReadOnlyList<string>> GetNumbersEndingWithLockAsync(string ending, CancellationToken cancellationToken);

    /// <summary>Lần cấp gần nhất theo biểu mẫu + số hợp đồng (biên bản thanh toán theo hợp đồng).</summary>
    Task<IssuedDocument?> GetLatestByContractWithLockAsync(
        int templateId, string contractNumber, CancellationToken cancellationToken);

    Task<int?> GetMaxSequenceAsync(int templateId, int year, CancellationToken cancellationToken);

    Task<IReadOnlyList<string>> GetContractNumbersAsync(int templateId, CancellationToken cancellationToken);

    /// <summary>Văn bản để xuất Excel, kèm biểu mẫu; year null = mọi năm.</summary>
    Task<IReadOnlyList<IssuedDocument>> GetForExportAsync(int? year, CancellationToken cancellationToken);

    /// <summary>Đọc bảng Employee (chỉ đọc) để lấy thông tin người lấy số.</summary>
    Task<Employee?> GetEmployeeByEmpCodeAsync(string empCode, CancellationToken cancellationToken);

    void Add(IssuedDocument document);

    void Remove(IssuedDocument document);
}
