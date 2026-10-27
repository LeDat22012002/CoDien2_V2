using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.DTOs;

// ===== Response =====

public class PageDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Path { get; init; }
    public string? ExternalUrl { get; init; }
    public string? Icon { get; init; }
    public int? ParentId { get; init; }
    public string Area { get; init; } = PageAreas.Admin;
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

    /// <summary>Route phía Client, bắt đầu bằng "/". Bỏ trống với nút nhóm menu hoặc liên kết ngoài.</summary>
    public string? Path { get; set; }

    /// <summary>Liên kết ngoài http/https, mở tab mới. Không nhập cùng Path.</summary>
    public string? ExternalUrl { get; set; }

    public string? Icon { get; set; }
    public int? ParentId { get; set; }

    /// <summary>ADMIN (menu quản trị) hoặc PUBLIC (menu header trang công khai). Trang con cùng Area với trang cha.</summary>
    public string Area { get; set; } = PageAreas.Admin;

    /// <summary>Quyền cần để thấy trang (chỉ trang ADMIN). Bỏ trống = ai đăng nhập cũng thấy.</summary>
    public int? PermissionId { get; set; }

    public int SortOrder { get; set; }
    public bool IsMenu { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public class CreatePageRequest : PageRequestBase;

public class UpdatePageRequest : PageRequestBase;
