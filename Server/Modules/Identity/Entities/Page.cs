namespace Server.Modules.Identity.Entities;

/// <summary>
/// Danh mục trang/liên kết menu của Client. Area tách menu quản trị (Sider) và menu header trang công khai.
/// Trang ADMIN: user thấy khi có PermissionId tương ứng. Trang PUBLIC: chỉ là liên kết điều hướng, không gắn quyền.
/// </summary>
public class Page
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>Route phía Client, vd "/employees". Null với nút nhóm menu hoặc liên kết ngoài.</summary>
    public string? Path { get; set; }

    /// <summary>Liên kết ngoài (http/https), mở ở tab mới. Không dùng cùng Path.</summary>
    public string? ExternalUrl { get; set; }

    public string? Icon { get; set; }
    public int? ParentId { get; set; }

    /// <summary>Menu chứa trang: <see cref="PageAreas"/>.</summary>
    public string Area { get; set; } = PageAreas.Admin;

    /// <summary>Quyền xem trang (chỉ trang ADMIN). Null = mọi người đã đăng nhập đều thấy (vd Dashboard).</summary>
    public int? PermissionId { get; set; }

    public int SortOrder { get; set; }

    /// <summary>False với trang không hiện trên menu (vd trang chi tiết /employees/:id).</summary>
    public bool IsMenu { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public Page? Parent { get; set; }
    public ICollection<Page> Children { get; set; } = [];
    public Permission? Permission { get; set; }
}

public static class PageAreas
{
    /// <summary>Menu Sider của trang quản trị; quyền vào route tính theo các trang này.</summary>
    public const string Admin = "ADMIN";

    /// <summary>Menu header của trang công khai (landing), ai cũng xem được.</summary>
    public const string Public = "PUBLIC";

    public static readonly IReadOnlySet<string> All = new HashSet<string> { Admin, Public };
}
