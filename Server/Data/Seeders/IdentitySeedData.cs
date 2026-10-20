using Server.Shared.Constants;

namespace Server.Data.Seeders;

/// <summary>
/// Permissions: danh mục quyền do code định nghĩa. Thêm chức năng mới cần quyền mới → thêm mã vào PermissionCodes
/// và thêm dòng vào đây; lần khởi động sau seeder tự thêm vào DB, admin gán cho role trên FE.
/// Pages: chỉ là bộ trang mặc định cho lần cài đặt đầu; sau đó trang được thêm/sửa/xóa từ FE.
/// </summary>
public static class IdentitySeedData
{
    public record PermissionSeed(string Code, string Name, string Module, int SortOrder);

    /// <summary>ParentCode null = trang cấp 1; Path null = nút nhóm menu; PermissionCode null = ai đăng nhập cũng thấy.</summary>
    public record PageSeed(
        string Code, string Title, string? Path, string? Icon, string? ParentCode,
        string? PermissionCode, int SortOrder, bool IsMenu = true);

    public static readonly IReadOnlyList<PermissionSeed> Permissions =
    [
        new(PermissionCodes.Employees.View, "Xem nhân viên", "employees", 10),
        new(PermissionCodes.Employees.Create, "Thêm nhân viên", "employees", 11),
        new(PermissionCodes.Employees.Update, "Sửa nhân viên", "employees", 12),
        new(PermissionCodes.Employees.Delete, "Xóa nhân viên", "employees", 13),

        new(PermissionCodes.Users.View, "Xem tài khoản", "users", 20),
        new(PermissionCodes.Users.Create, "Tạo tài khoản", "users", 21),
        new(PermissionCodes.Users.Update, "Sửa tài khoản, gán vai trò", "users", 22),
        new(PermissionCodes.Users.ResetPassword, "Đặt lại mật khẩu", "users", 23),

        new(PermissionCodes.Roles.View, "Xem vai trò", "roles", 30),
        new(PermissionCodes.Roles.Manage, "Quản lý vai trò và phân quyền", "roles", 31),

        new(PermissionCodes.Pages.Manage, "Quản lý trang và menu", "pages", 40),
    ];

    public static readonly IReadOnlyList<PageSeed> Pages =
    [
        new("dashboard", "Tổng quan", "/", "DashboardOutlined", null, null, 10),
        new("employees", "Nhân viên", "/employees", "TeamOutlined", null, PermissionCodes.Employees.View, 20),
        new("system", "Quản trị hệ thống", null, "SettingOutlined", null, null, 90),
        new("users", "Tài khoản", "/admin/users", "UserOutlined", "system", PermissionCodes.Users.View, 91),
        new("roles", "Vai trò và phân quyền", "/admin/roles", "SafetyOutlined", "system", PermissionCodes.Roles.View, 92),
        new("pages", "Trang và menu", "/admin/pages", "MenuOutlined", "system", PermissionCodes.Pages.Manage, 93),
    ];
}
