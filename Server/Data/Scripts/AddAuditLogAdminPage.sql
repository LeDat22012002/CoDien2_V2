/*
 * Thêm trang "Nhật ký hệ thống" (/admin/audit-logs) vào nhóm "Quản trị hệ thống" của menu Sider ADMIN.
 * IdentitySeeder chỉ seed trang khi Area ADMIN chưa có trang nào, nên DB đang dùng phải thêm bằng script này
 * (hoặc tạo tay ở Quản trị hệ thống → Trang và menu). Chạy lặp lại an toàn.
 * Chạy SAU khi đã khởi động Server bản mới 1 lần (seeder thêm quyền audit-logs.view).
 *   sqlcmd -S <server> -d NM_CD2 -I -f 65001 -i Data/Scripts/AddAuditLogAdminPage.sql
 */
SET NOCOUNT ON;

DECLARE @PermissionId int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'audit-logs.view');
DECLARE @ParentId int = (SELECT [Id] FROM [dbo].[Page] WHERE [Code] = 'system' AND [Area] = 'ADMIN');

IF @PermissionId IS NULL
BEGIN
    PRINT N'Chưa có quyền audit-logs.view: khởi động Server một lần để seeder thêm quyền rồi chạy lại';
    RETURN;
END

IF EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Code] = 'audit-logs')
   OR EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Area] = 'ADMIN' AND [Path] = '/admin/audit-logs')
BEGIN
    PRINT N'Trang /admin/audit-logs đã có';
    RETURN;
END

-- Không tìm thấy nhóm "Quản trị hệ thống" thì đặt ở menu cấp 1
INSERT INTO [dbo].[Page] ([Code], [Title], [Path], [Icon], [ParentId], [Area], [PermissionId], [SortOrder], [IsMenu], [IsActive])
VALUES ('audit-logs', N'Nhật ký hệ thống', '/admin/audit-logs', 'AuditOutlined', @ParentId, 'ADMIN', @PermissionId, 95, 1, 1);

PRINT N'Đã thêm trang Nhật ký hệ thống';
