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
        public static class Materials
    {
        /// <summary>Xem danh mục vật tư ở trang quản trị (gợi ý mã khi nhập báo cáo chỉ cần đăng nhập).</summary>
        public const string View = "materials.view";

        /// <summary>Thêm / sửa / xóa vật tư trong danh mục.</summary>
        public const string Manage = "materials.manage";
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
    /// Kế hoạch & báo cáo công việc tuần. Mã quyền (gán theo role) quyết định VAI TRÒ được dùng;
    /// sơ đồ tổ chức / phân công kỹ sư quyết định PHẠM VI (tổ/kíp, đội, xưởng nào).
    /// </summary>
    public static class WorkReports
    {
        /// <summary>Kỹ sư: lập kế hoạch, báo cáo tuần cho tổ/kíp được phân công (trang /member/work-reports).
        /// Kỹ sư được phân công mặc định thêm/sửa/xóa kế hoạch, báo cáo của tổ/kíp mình (không cần 6 quyền bên dưới).</summary>
        public const string Submit = "work-reports.submit";

        /// <summary>Đội trưởng/phó, quản đốc/phó: xem báo cáo tuần của đội/xưởng mình, cấu hình tổ/kíp (quản đốc/phó)
        /// (trang /admin/work-reports). Không gồm phân công kỹ sư, mở khóa, thêm/sửa/xóa dòng (quyền riêng bên dưới).</summary>
        public const string Manage = "work-reports.manage";

        /// <summary>Phân công kỹ sư phụ trách tổ/kíp. Phạm vi theo sơ đồ: quản đốc/phó → mọi tổ/kíp của xưởng;
        /// đội trưởng/phó → tổ thuộc đội (kíp chỉ quản đốc/phó); có thêm configure → mọi xưởng.</summary>
        public const string AssignEngineers = "work-reports.assign-engineers";

        /// <summary>Mở khóa kế hoạch / báo cáo đã quá hạn (tối đa 30 ngày) hoặc khóa lại. Phạm vi như 6 quyền thêm/sửa/xóa:
        /// quản đốc/phó → mọi tổ/kíp của xưởng; đội trưởng/phó → tổ thuộc đội; có thêm configure → mọi xưởng.</summary>
        public const string Unlock = "work-reports.unlock";

        /// <summary>Cấu hình: đầu mục công việc, mục đích vật tư, hằng số giờ công, hạn nộp, đơn vị báo cáo mọi xưởng.
        /// Không tự có quyền mở khóa / phân công kỹ sư (cần thêm unlock / assign-engineers, khi đó phạm vi là mọi xưởng).</summary>
        public const string Configure = "work-reports.configure";

        // Thêm/sửa/xóa dòng (và vật tư) của người KHÔNG phải kỹ sư phụ trách, admin cấp cho role.
        // Phạm vi theo sơ đồ: trưởng/phó đội → tổ thuộc đội; trưởng/phó xưởng → mọi tổ/kíp của xưởng; admin → mọi xưởng.

        public const string PlanCreate = "work-reports.plan.create";
        public const string PlanUpdate = "work-reports.plan.update";
        public const string PlanDelete = "work-reports.plan.delete";
        public const string ReportCreate = "work-reports.report.create";
        public const string ReportUpdate = "work-reports.report.update";
        public const string ReportDelete = "work-reports.report.delete";

        // Xem báo cáo mọi xưởng (Ban Giám đốc): trang công khai /work-reports, API GET /api/work-reports/public/*, không cần quyền
    }

    public static class AuditLogs
    {
        /// <summary>Xem nhật ký đăng nhập, truy cập trang, thao tác của mọi người dùng.</summary>
        public const string View = "audit-logs.view";
    }
}
