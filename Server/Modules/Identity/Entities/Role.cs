using Server.Shared.Entities;

namespace Server.Modules.Identity.Entities;

// ===== Entity =====

public class Role : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Role hệ thống (SUPER_ADMIN): không sửa quyền, không xóa.</summary>
    public bool IsSystem { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<RolePermission> RolePermissions { get; set; } = [];
}

// ===== Giá trị cố định =====

public static class RoleCodes
{
    /// <summary>Admin tổng: bỏ qua mọi kiểm tra quyền, thấy mọi trang.</summary>
    public const string SuperAdmin = "SUPER_ADMIN";
}
