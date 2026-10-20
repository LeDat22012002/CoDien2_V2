namespace Server.Shared.Constants;

/// <summary>
/// Mã quyền dùng chung toàn hệ thống, dạng "&lt;module&gt;.&lt;hành động&gt;".
/// Thêm module mới: khai báo nhóm hằng số ở đây và bổ sung vào danh mục seed (tên hiển thị, nhóm, thứ tự).
/// </summary>
public static class PermissionCodes
{
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
}
