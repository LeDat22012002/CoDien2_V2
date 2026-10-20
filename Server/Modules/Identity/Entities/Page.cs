namespace Server.Modules.Identity.Entities;

/// <summary>Danh mục trang (route) của Client, seed khi khởi động. User thấy trang khi có PermissionId tương ứng.</summary>
public class Page
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>Route phía Client, vd "/employees". Null với nút nhóm menu.</summary>
    public string? Path { get; set; }

    public string? Icon { get; set; }
    public int? ParentId { get; set; }

    /// <summary>Quyền xem trang. Null = mọi người đã đăng nhập đều thấy (vd Dashboard).</summary>
    public int? PermissionId { get; set; }

    public int SortOrder { get; set; }

    /// <summary>False với trang không hiện trên menu (vd trang chi tiết /employees/:id).</summary>
    public bool IsMenu { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public Page? Parent { get; set; }
    public ICollection<Page> Children { get; set; } = [];
    public Permission? Permission { get; set; }
}
