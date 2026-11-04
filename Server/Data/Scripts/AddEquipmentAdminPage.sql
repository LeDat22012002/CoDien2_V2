/*
 * Thêm trang quản trị "Danh mục thiết bị" (/admin/equipments) vào menu Sider ADMIN.
 * IdentitySeeder chỉ seed trang khi Area ADMIN chưa có trang nào, nên DB đang dùng phải thêm bằng script này
 * (hoặc tạo tay ở Quản trị hệ thống → Trang và menu). Chạy lặp lại an toàn.
 *   sqlcmd -S <server> -d NM_CD2 -I -f 65001 -i Data/Scripts/AddEquipmentAdminPage.sql
 * Người thấy menu: có quyền equipments.manage (gán trên FE ở Phân quyền) hoặc SUPER_ADMIN.
 */
SET NOCOUNT ON;

DECLARE @PermissionId int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'equipments.manage');

IF @PermissionId IS NULL
BEGIN
    PRINT N'Chưa có quyền equipments.manage: khởi động Server một lần để seeder thêm quyền rồi chạy lại';
    RETURN;
END

IF EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Code] = 'equipments')
   OR EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Area] = 'ADMIN' AND [Path] = '/admin/equipments')
BEGIN
    PRINT N'Trang /admin/equipments đã có';
    RETURN;
END

INSERT INTO [dbo].[Page] ([Code], [Title], [Path], [Icon], [ParentId], [Area], [PermissionId], [SortOrder], [IsMenu], [IsActive])
VALUES ('equipments', N'Danh mục thiết bị', '/admin/equipments', 'ToolOutlined', NULL, 'ADMIN', @PermissionId, 50, 1, 1);

PRINT N'Đã thêm trang Danh mục thiết bị';
