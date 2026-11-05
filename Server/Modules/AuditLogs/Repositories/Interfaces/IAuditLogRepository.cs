using Server.Modules.AuditLogs.DTOs;
using Server.Modules.AuditLogs.Entities;

namespace Server.Modules.AuditLogs.Repositories.Interfaces;

public interface IAuditLogRepository
{
    /// <summary>Mới nhất lên đầu.</summary>
    Task<(IReadOnlyList<AuditLogDto> Items, int TotalCount)> GetPagedAsync(
        AuditLogFilterRequest filter, CancellationToken cancellationToken);

    void AddRange(IEnumerable<AuditLog> logs);

    /// <summary>Xóa cứng log ghi trước mốc thời gian; trả số dòng đã xóa.</summary>
    Task<int> DeleteOlderThanAsync(DateTime threshold, CancellationToken cancellationToken);
}
