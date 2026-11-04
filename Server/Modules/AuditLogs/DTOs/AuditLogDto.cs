using Server.Shared.Models;

namespace Server.Modules.AuditLogs.DTOs;

// ===== Response =====

public class AuditLogDto
{
    public long Id { get; init; }
    public string Type { get; init; } = string.Empty;
    public int? UserId { get; init; }
    public string? EmpCode { get; init; }
    public string? FullName { get; init; }
    public string? Method { get; init; }
    public string Path { get; init; } = string.Empty;
    public string? PageTitle { get; init; }
    public string? Endpoint { get; init; }
    public int? StatusCode { get; init; }
    public bool IsSuccess { get; init; }
    public string? Message { get; init; }
    public string? RequestBody { get; init; }
    public string? IpAddress { get; init; }
    public string? UserAgent { get; init; }
    public int? DurationMs { get; init; }
    public DateTime CreatedAt { get; init; }
}

// ===== Request =====

/// <summary>Client báo người dùng (đã đăng nhập) vừa mở trang.</summary>
public class CreatePageViewRequest
{
    /// <summary>Đường dẫn trang ở Client, vd "/admin/employees".</summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>Tên trang theo menu; không tìm được thì bỏ trống.</summary>
    public string? Title { get; set; }
}

/// <summary>
/// Keyword tìm trong mã NV, họ tên, đường dẫn, tên trang, thông báo. Type: LOGIN | PAGE_VIEW | ACTION.
/// IsSuccess: lọc thành công / thất bại. FromDate/ToDate theo ngày ghi log (giờ địa phương).
/// </summary>
public class AuditLogFilterRequest : PagedRequest
{
    public string? Type { get; set; }
    public string? EmpCode { get; set; }
    public bool? IsSuccess { get; set; }
    public string? Method { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
}
