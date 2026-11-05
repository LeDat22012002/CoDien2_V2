namespace Server.Modules.AuditLogs.Entities;

// ===== Entity =====

/// <summary>
/// Nhật ký hệ thống: đăng nhập, truy cập trang, thao tác thêm/sửa/xóa. Không kế thừa BaseEntity
/// (không xóa mềm, không audit chính nó); log cũ hơn số ngày cấu hình bị xóa cứng hằng ngày.
/// </summary>
public class AuditLog
{
    public long Id { get; set; }

    /// <summary>Giá trị trong <see cref="AuditLogTypes"/>.</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Null khi đăng nhập thất bại (chưa xác định được tài khoản).</summary>
    public int? UserId { get; set; }

    /// <summary>Mã NV đăng nhập; đăng nhập thất bại lấy theo mã đã gõ.</summary>
    public string? EmpCode { get; set; }

    public string? FullName { get; set; }

    /// <summary>POST | PUT | PATCH | DELETE; trang truy cập để null.</summary>
    public string? Method { get; set; }

    /// <summary>Thao tác: đường dẫn API kèm query; truy cập trang: đường dẫn trang ở Client.</summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>Tên trang (truy cập trang) theo menu tại thời điểm truy cập.</summary>
    public string? PageTitle { get; set; }

    /// <summary>Controller.Action xử lý request, vd "Incidents.UpdateAnalysis".</summary>
    public string? Endpoint { get; set; }

    public int? StatusCode { get; set; }

    /// <summary>Thao tác thành công (mã HTTP &lt; 400). Truy cập trang luôn true.</summary>
    public bool IsSuccess { get; set; }

    /// <summary>Thông báo Server trả về (lý do lỗi hoặc thông báo thành công).</summary>
    public string? Message { get; set; }

    /// <summary>Dữ liệu gửi lên dạng JSON, đã che mật khẩu / token; file chỉ ghi tên và dung lượng.</summary>
    public string? RequestBody { get; set; }

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    /// <summary>Thời gian Server xử lý (ms).</summary>
    public int? DurationMs { get; set; }

    /// <summary>Giờ địa phương (giờ Việt Nam).</summary>
    public DateTime CreatedAt { get; set; }
}

// ===== Hằng số =====

public static class AuditLogTypes
{
    public const string Login = "LOGIN";
    public const string PageView = "PAGE_VIEW";
    public const string Action = "ACTION";

    public static readonly IReadOnlySet<string> All = new HashSet<string> { Login, PageView, Action };
}

/// <summary>Độ dài tối đa các cột chữ; nội dung dài hơn được cắt trước khi ghi.</summary>
public static class AuditLogLimits
{
    public const int PathMaxLength = 500;
    public const int PageTitleMaxLength = 200;
    public const int MessageMaxLength = 1000;
    public const int RequestBodyMaxLength = 4000;
    public const int UserAgentMaxLength = 500;
}
