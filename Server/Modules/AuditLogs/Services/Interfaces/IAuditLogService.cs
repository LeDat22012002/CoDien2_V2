using Server.Modules.AuditLogs.DTOs;
using Server.Shared.Models;

namespace Server.Modules.AuditLogs.Services.Interfaces;

public interface IAuditLogService
{
    Task<PagedResult<AuditLogDto>> GetPagedAsync(AuditLogFilterRequest filter, CancellationToken cancellationToken);

    /// <summary>Ghi lượt mở trang của người đang đăng nhập (đưa vào hàng đợi, ghi DB ở nền).</summary>
    void LogPageView(CreatePageViewRequest request);
}
