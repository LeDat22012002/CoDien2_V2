using System.Security.Claims;
using Server.Modules.AuditLogs.Entities;
using Server.Shared.Constants;

namespace Server.Modules.AuditLogs.Services;

/// <summary>Tạo bản ghi log kèm người dùng (theo token), IP, trình duyệt và giờ ghi từ request hiện tại.</summary>
public static class AuditLogFactory
{
    public static AuditLog Create(HttpContext context, string type, string path)
    {
        var user = context.User;
        return new AuditLog
        {
            Type = type,
            UserId = int.TryParse(user.FindFirstValue(AppClaimTypes.UserId), out var userId) ? userId : null,
            EmpCode = user.FindFirstValue(AppClaimTypes.EmpCode),
            FullName = user.FindFirstValue(AppClaimTypes.FullName),
            Path = Truncate(path, AuditLogLimits.PathMaxLength) ?? string.Empty,
            IpAddress = context.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Truncate(context.Request.Headers.UserAgent.ToString(), AuditLogLimits.UserAgentMaxLength),
            CreatedAt = DateTime.Now,
        };
    }

    public static string? Truncate(string? value, int maxLength) =>
        string.IsNullOrEmpty(value) || value.Length <= maxLength ? NullIfEmpty(value) : value[..maxLength];

    private static string? NullIfEmpty(string? value) => string.IsNullOrEmpty(value) ? null : value;
}
