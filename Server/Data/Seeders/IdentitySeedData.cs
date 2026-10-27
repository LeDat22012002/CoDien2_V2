using Server.Modules.Identity.Entities;
using Server.Shared.Constants;

namespace Server.Data.Seeders;

/// <summary>
/// Permissions: danh mục quyền do code định nghĩa. Thêm chức năng mới cần quyền mới → thêm mã vào PermissionCodes
/// và thêm dòng vào đây; lần khởi động sau seeder tự thêm vào DB, admin gán cho role trên FE.
/// Pages: bộ trang mặc định, seed riêng từng Area khi Area đó chưa có trang nào; sau đó trang được thêm/sửa/xóa từ FE.
/// </summary>
public static class IdentitySeedData
{
    public record PermissionSeed(string Code, string Name, string Module, int SortOrder);

    /// <summary>
    /// ParentCode null = trang cấp 1; Path và ExternalUrl null = nút nhóm menu; PermissionCode null = ai đăng nhập cũng thấy.
    /// Area PUBLIC = menu header trang công khai (không gắn quyền).
    /// </summary>
    public record PageSeed(
        string Code, string Title, string? Path, string? Icon, string? ParentCode,
        string? PermissionCode, int SortOrder, bool IsMenu = true,
        string Area = PageAreas.Admin, string? ExternalUrl = null);

    public static readonly IReadOnlyList<PermissionSeed> Permissions =
    [
        new(PermissionCodes.DashBoards.View, "Xem tổng quan quản trị", "dashboard", 5),

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

        new(PermissionCodes.Equipments.Manage, "Quản lý danh mục thiết bị", "equipments", 70),

        new(PermissionCodes.Incidents.Analyze, "Phân tích sự cố của xưởng mình", "incidents", 80),
        new(PermissionCodes.Incidents.Manage, "Quản lý báo cáo sự cố (sửa đầy đủ, xóa, import)", "incidents", 81),
    ];

    public static readonly IReadOnlyList<PageSeed> Pages =
    [
        new("dashboard", "Tổng quan", "/admin/dashboard", "DashboardOutlined", null, PermissionCodes.DashBoards.View, 10),
        new("employees", "Nhân viên", "/admin/employees", "TeamOutlined", null, PermissionCodes.Employees.View, 20),
        new("org-chart", "Sơ đồ tổ chức", "/org-chart", "ApartmentOutlined", null, PermissionCodes.OrgChart.View, 30),
        new("organization", "Tổ chức", null, "ClusterOutlined", null, null, 31),
        new("org-units", "Cơ cấu tổ chức", "/admin/org-units", "ClusterOutlined", "organization", PermissionCodes.OrgUnits.Manage, 32),
        new("position-levels", "Cấp bậc", "/admin/position-levels", "OrderedListOutlined", "organization", PermissionCodes.OrgUnits.Manage, 33),
        new("documents", "Văn bản", null, "FileTextOutlined", null, null, 40),
        new("document-issue", "Lấy số văn bản", "/documents/issue", "NumberOutlined", "documents", PermissionCodes.Documents.Issue, 41),
        new("issued-documents", "Sổ văn bản đã cấp", "/documents", "BookOutlined", "documents", PermissionCodes.Documents.View, 42),
        new("document-templates", "Biểu mẫu", "/documents/templates", "ProfileOutlined", "documents", PermissionCodes.DocumentTemplates.Manage, 43),
        new("system", "Quản trị hệ thống", null, "SettingOutlined", null, null, 90),
        new("users", "Tài khoản", "/admin/users", "UserOutlined", "system", PermissionCodes.Users.View, 91),
        new("roles", "Vai trò và phân quyền", "/admin/roles", "SafetyOutlined", "system", PermissionCodes.Roles.View, 92),
        new("pages", "Trang và menu", "/admin/pages", "MenuOutlined", "system", PermissionCodes.Pages.Manage, 93),

        // Menu header trang công khai (giống hệ thống cũ)
        new("public-document-issue", "Lấy số văn bản", "/documents/issue", null, null, null, 110,
            Area: PageAreas.Public),
        new("public-reports", "Báo cáo nhà máy", null, null, null, null, 120, Area: PageAreas.Public),
        new("public-incidents", "Báo cáo sự cố", "/incidents", null, "public-reports", null, 121,
            Area: PageAreas.Public),
        new("public-powerbi", "Báo cáo PowerBI", null, null, "public-reports", null, 122, Area: PageAreas.Public,
            ExternalUrl: "https://app.powerbi.com/view?r=eyJrIjoiMjdhZGYxMWYtMTU3My00YzkzLWJjMDAtYjhmYzIzNTUwMGY4IiwidCI6ImIxNThlOWE1LTA2OTEtNGU0Zi1iYmExLTQxN2I5OWVjZDBhMCIsImMiOjEwfQ%3D%3D"),
        new("public-digital", "Số hóa", null, null, null, null, 130, Area: PageAreas.Public),
        new("public-ironmaking", "Vận hành Luyện Gang", null, null, "public-digital", null, 131, Area: PageAreas.Public,
            ExternalUrl: "https://nmlg.hoaphatdungquat.vn/"),
        new("public-thermal-power", "Vận hành Nhiệt Điện", null, null, "public-digital", null, 132, Area: PageAreas.Public,
            ExternalUrl: "https://nmnd.hoaphatdungquat.vn/"),
        new("public-equipment-monitoring", "Giám sát Thiết bị Cấp A", null, null, "public-digital", null, 133,
            Area: PageAreas.Public, ExternalUrl: "http://10.192.226.25:8082"),
    ];
}
