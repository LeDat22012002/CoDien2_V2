namespace Server.Shared.Constants;

/// <summary>
/// Mã quyền dùng chung toàn hệ thống, dạng "&lt;module&gt;.&lt;hành động&gt;".
/// Thêm module mới: khai báo nhóm hằng số ở đây và bổ sung vào danh mục seed (tên hiển thị, nhóm, thứ tự).
/// </summary>
public static class PermissionCodes
{
    public static class DashBoards
    {
        /// <summary>Xem trang tổng quan của khu quản trị (/admin/dashboard).</summary>
        public const string View = "dashboard.view";
    }

    public static class Employees
    {
        public const string View = "employees.view";
        public const string Create = "employees.create";
        public const string Update = "employees.update";
        public const string Delete = "employees.delete";
    }

    public static class Users
    {
        public const string View = "users.view";
        public const string Create = "users.create";
        public const string Update = "users.update";
        public const string ResetPassword = "users.reset-password";
        public const string Delete = "users.delete";
    }

    public static class Roles
    {
        public const string View = "roles.view";
        public const string Manage = "roles.manage";
    }

    public static class Pages
    {
        public const string Manage = "pages.manage";
    }

    public static class OrgChart
    {
        public const string View = "org-chart.view";
    }

    public static class OrgUnits
    {
        /// <summary>Thêm/sửa/xóa/sắp xếp đơn vị và sửa cấp bậc.</summary>
        public const string Manage = "org-units.manage";
    }

    public static class Assignments
    {
        public const string View = "assignments.view";
        public const string Manage = "assignments.manage";
    }

    public static class Documents
    {
        /// <summary>Xem sổ văn bản đã cấp, xuất Excel.</summary>
        public const string View = "documents.view";

        /// <summary>Lấy số văn bản, sửa văn bản của chính mình.</summary>
        public const string Issue = "documents.issue";

        /// <summary>Sửa văn bản của người khác, xóa số mới nhất.</summary>
        public const string Manage = "documents.manage";
    }

    public static class DocumentTemplates
    {
        public const string Manage = "document-templates.manage";
    }

    public static class Equipments
    {
        /// <summary>Thêm/sửa/xóa/import danh mục thiết bị (xem chỉ cần đăng nhập).</summary>
        public const string Manage = "equipments.manage";
    }

    /// <summary>Báo cáo sự cố: xem công khai, tạo chỉ cần đăng nhập (không cần mã quyền).</summary>
    public static class Incidents
    {
        /// <summary>Thêm báo cáo sự cố.</summary>
        public const string Create = "incidents.create";

        /// <summary>Cập nhật tiến độ (mốc thời gian, mô tả, phương án) báo cáo thuộc xưởng của mình, kể cả do người khác nhập.</summary>
        public const string UpdateProgress = "incidents.update-progress";

        /// <summary>Nhập phân tích, bổ sung số order/link cho báo cáo thuộc xưởng của mình.</summary>
        public const string Analyze = "incidents.analyze";

        /// <summary>Admin chức năng: sửa đầy đủ, phân tích/bổ sung mọi xưởng, xóa, import Excel.</summary>
        public const string Manage = "incidents.manage";
    }
     /// <summary>
    /// Kế hoạch & báo cáo công việc tuần. Xem/nhập/sửa/mở khóa theo PHẠM VI suy ra từ sơ đồ tổ chức
    /// (kỹ sư phụ trách, đội trưởng/phó, quản đốc/phó) nên không cần mã quyền; 2 mã dưới cho admin và cấp nhà máy.
    /// </summary>
    public static class WorkReports
    {
        /// <summary>Cấu hình: đầu mục công việc, mục đích vật tư, hằng số giờ công, hạn nộp, đơn vị báo cáo mọi xưởng.</summary>
        public const string Configure = "work-reports.configure";

        /// <summary>Xem báo cáo / kế hoạch / tổng hợp của mọi xưởng (Ban Giám đốc, cấp nhà máy).</summary>
        public const string ViewFactory = "work-reports.view-factory";
    }

    public static class AuditLogs
    {
        /// <summary>Xem nhật ký đăng nhập, truy cập trang, thao tác của mọi người dùng.</summary>
        public const string View = "audit-logs.view";
    }
}
