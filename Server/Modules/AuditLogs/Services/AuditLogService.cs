using Server.Modules.AuditLogs.DTOs;
using Server.Modules.AuditLogs.Entities;
using Server.Modules.AuditLogs.Repositories.Interfaces;
using Server.Modules.AuditLogs.Services.Interfaces;
using Server.Shared.Exceptions;
using Server.Shared.Models;

namespace Server.Modules.AuditLogs.Services;

public class AuditLogService(
    IAuditLogRepository auditLogRepository,
    IAuditLogQueue auditLogQueue,
    IHttpContextAccessor httpContextAccessor) : IAuditLogService
{
    public async Task<PagedResult<AuditLogDto>> GetPagedAsync(
        AuditLogFilterRequest filter, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(filter.Type) && !AuditLogTypes.All.Contains(filter.Type))
        {
            throw new BusinessException("Loại nhật ký không hợp lệ.");
        }

        if (filter.FromDate > filter.ToDate)
        {
            throw new BusinessException("Từ ngày phải trước hoặc bằng đến ngày.");
        }

        var (items, totalCount) = await auditLogRepository.GetPagedAsync(filter, cancellationToken);

        return new PagedResult<AuditLogDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public void LogPageView(CreatePageViewRequest request)
    {
        var path = request.Path?.Trim();
        // Chỉ nhận đường dẫn nội bộ của Client, bỏ qua giá trị rác
        if (string.IsNullOrEmpty(path) || !path.StartsWith('/'))
        {
            throw new BusinessException("Đường dẫn trang không hợp lệ.");
        }

        var context = httpContextAccessor.HttpContext ?? throw new UnauthorizedException("Phiên đăng nhập không hợp lệ.");
        var log = AuditLogFactory.Create(context, AuditLogTypes.PageView, path);
        log.PageTitle = AuditLogFactory.Truncate(request.Title?.Trim(), AuditLogLimits.PageTitleMaxLength);
        log.IsSuccess = true;

        auditLogQueue.Enqueue(log);
    }
}
