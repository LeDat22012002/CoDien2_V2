using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.AuditLogs.DTOs;
using Server.Modules.AuditLogs.Entities;
using Server.Modules.AuditLogs.Repositories.Interfaces;

namespace Server.Modules.AuditLogs.Repositories;

public class AuditLogRepository(AppDbContext dbContext) : IAuditLogRepository
{
    private DbSet<AuditLog> AuditLogs => dbContext.Set<AuditLog>();

    public async Task<(IReadOnlyList<AuditLogDto> Items, int TotalCount)> GetPagedAsync(
        AuditLogFilterRequest filter, CancellationToken cancellationToken)
    {
        var query = AuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Type))
        {
            query = query.Where(x => x.Type == filter.Type);
        }

        if (!string.IsNullOrWhiteSpace(filter.EmpCode))
        {
            var empCode = filter.EmpCode.Trim();
            query = query.Where(x => x.EmpCode == empCode);
        }

        if (filter.IsSuccess is { } isSuccess)
        {
            query = query.Where(x => x.IsSuccess == isSuccess);
        }

        if (!string.IsNullOrWhiteSpace(filter.Method))
        {
            var method = filter.Method.Trim().ToUpperInvariant();
            query = query.Where(x => x.Method == method);
        }

        if (filter.FromDate is { } fromDate)
        {
            var from = fromDate.ToDateTime(TimeOnly.MinValue);
            query = query.Where(x => x.CreatedAt >= from);
        }

        if (filter.ToDate is { } toDate)
        {
            var to = toDate.AddDays(1).ToDateTime(TimeOnly.MinValue);
            query = query.Where(x => x.CreatedAt < to);
        }

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();
            query = query.Where(x =>
                (x.EmpCode != null && x.EmpCode.Contains(keyword))
                || (x.FullName != null && x.FullName.Contains(keyword))
                || x.Path.Contains(keyword)
                || (x.PageTitle != null && x.PageTitle.Contains(keyword))
                || (x.Message != null && x.Message.Contains(keyword)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.Id)
            .Skip((filter.PageIndex - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(x => new AuditLogDto
            {
                Id = x.Id,
                Type = x.Type,
                UserId = x.UserId,
                EmpCode = x.EmpCode,
                FullName = x.FullName,
                Method = x.Method,
                Path = x.Path,
                PageTitle = x.PageTitle,
                Endpoint = x.Endpoint,
                StatusCode = x.StatusCode,
                IsSuccess = x.IsSuccess,
                Message = x.Message,
                RequestBody = x.RequestBody,
                IpAddress = x.IpAddress,
                UserAgent = x.UserAgent,
                DurationMs = x.DurationMs,
                CreatedAt = x.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public void AddRange(IEnumerable<AuditLog> logs) => AuditLogs.AddRange(logs);

    public Task<int> DeleteOlderThanAsync(DateTime threshold, CancellationToken cancellationToken) =>
        AuditLogs.Where(x => x.CreatedAt < threshold).ExecuteDeleteAsync(cancellationToken);
}
