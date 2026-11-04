/*
 * Thêm quyền incidents.create (Thêm báo cáo sự cố). IdentitySeeder cũng tự thêm khi khởi động;
 * script này dùng khi cần thêm ngay trên DB. Chạy lặp lại an toàn.
 *   sqlcmd -S <server> -d NM_CD2 -I -f 65001 -i Data/Scripts/AddIncidentCreatePermission.sql
 * Sau khi thêm, gán quyền cho vai trò trên FE (Quản trị hệ thống → Phân quyền).
 */
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [Code] = 'incidents.create')
BEGIN
    INSERT INTO [dbo].[Permission] ([Code], [Name], [Module], [SortOrder])
    VALUES ('incidents.create', N'Thêm báo cáo sự cố', 'incidents', 79);
    PRINT N'Đã thêm quyền incidents.create';
END
ELSE
    PRINT N'Quyền incidents.create đã có';
