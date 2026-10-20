namespace Server.Modules.Identity.DTOs;

// ===== Response =====

public class PageDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Path { get; init; }
    public string? Icon { get; init; }
    public int? ParentId { get; init; }
    public int? PermissionId { get; init; }
    public string? PermissionCode { get; init; }
    public int SortOrder { get; init; }
    public bool IsMenu { get; init; }
    public bool IsActive { get; init; }
    public List<PageDto> Children { get; init; } = [];
}

// ===== Request =====

public abstract class PageRequestBase
{
    /// <summary>Viết thường, không dấu, dùng '-' (vd "goods-receipts").</summary>
    public string Code { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    /// <summary>Route phía Client, bắt đầu bằng "/". Bỏ trống với nút nhóm menu.</summary>
    public string? Path { get; set; }

    public string? Icon { get; set; }
    public int? ParentId { get; set; }

    /// <summary>Quyền cần để thấy trang. Bỏ trống = ai đăng nhập cũng thấy.</summary>
    public int? PermissionId { get; set; }

    public int SortOrder { get; set; }
    public bool IsMenu { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public class CreatePageRequest : PageRequestBase;

public class UpdatePageRequest : PageRequestBase;
