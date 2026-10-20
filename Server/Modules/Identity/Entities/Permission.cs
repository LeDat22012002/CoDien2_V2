namespace Server.Modules.Identity.Entities;

/// <summary>Danh mục quyền do code định nghĩa (Shared/Constants/PermissionCodes), seed khi khởi động; UI không thêm/xóa.</summary>
public class Permission
{
    public int Id { get; set; }

    /// <summary>Mã quyền dạng "&lt;module&gt;.&lt;hành động&gt;", vd "employees.create".</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>Nhóm hiển thị trên màn ma trận quyền, vd "employees".</summary>
    public string Module { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = [];
}
