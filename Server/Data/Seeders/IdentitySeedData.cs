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

        new(PermissionCodes.OrgChart.View, "Xem sơ đồ tổ chức", "organization", 50),
        new(PermissionCodes.OrgUnits.Manage, "Quản lý đơn vị và cấp bậc", "organization", 51),
        new(PermissionCodes.Assignments.View, "Xem lịch sử chức vụ", "organization", 52),
        new(PermissionCodes.Assignments.Manage, "Bổ nhiệm, điều chuyển, thôi chức", "organization", 53),

        new(PermissionCodes.Documents.View, "Xem sổ văn bản đã cấp", "documents", 60),
        new(PermissionCodes.Documents.Issue, "Lấy số văn bản", "documents", 61),
        new(PermissionCodes.Documents.Manage, "Quản lý sổ văn bản (sửa của người khác, xóa số)", "documents", 62),
        new(PermissionCodes.DocumentTemplates.Manage, "Quản lý biểu mẫu", "documents", 63),
    ];

    public static readonly IReadOnlyList<PageSeed> Pages =
    [
        new("dashboard", "Tổng quan", "/", "DashboardOutlined", null, null, 10),
        new("employees", "Nhân viên", "/employees", "TeamOutlined", null, PermissionCodes.Employees.View, 20),
        new("org-chart", "Sơ đồ tổ chức", "/org-chart", "ApartmentOutlined", null, PermissionCodes.OrgChart.View, 30),
        new("org-units", "Cơ cấu tổ chức", "/organization/units", "ClusterOutlined", null, PermissionCodes.OrgUnits.Manage, 31),
        new("documents", "Văn bản", null, "FileTextOutlined", null, null, 40),
        new("document-issue", "Lấy số văn bản", "/documents/issue", "NumberOutlined", "documents", PermissionCodes.Documents.Issue, 41),
        new("issued-documents", "Sổ văn bản đã cấp", "/documents", "BookOutlined", "documents", PermissionCodes.Documents.View, 42),
        new("document-templates", "Biểu mẫu", "/documents/templates", "ProfileOutlined", "documents", PermissionCodes.DocumentTemplates.Manage, 43),
        new("system", "Quản trị hệ thống", null, "SettingOutlined", null, null, 90),
        new("users", "Tài khoản", "/admin/users", "UserOutlined", "system", PermissionCodes.Users.View, 91),
        new("roles", "Vai trò và phân quyền", "/admin/roles", "SafetyOutlined", "system", PermissionCodes.Roles.View, 92),
        new("pages", "Trang và menu", "/admin/pages", "MenuOutlined", "system", PermissionCodes.Pages.Manage, 93),
    ];
}
