/*
 * Trang + quyền của module Báo cáo công việc tuần cho DB đang dùng
 * (IdentitySeeder chỉ seed trang khi Area chưa có trang nào). Chạy lặp lại an toàn.
 *
 * Trước khi chạy: khởi động Server mới 1 lần để seeder thêm 3 mã quyền work-reports.* (script dừng nếu thiếu).
 *   sqlcmd -S <server> -d NM_CD2 -I -f 65001 -i Data/Scripts/AddWorkReportPages.sql
 *
 * Mã quyền → trang (gán quyền cho role ở Quản trị hệ thống → Phân quyền):
 *   work-reports.submit     Kỹ sư                 MEMBER /member/work-reports       "Báo cáo công việc tuần"
 *   work-reports.manage     Đội trưởng, quản đốc  ADMIN /admin/work-reports         "Báo cáo tuần › Quản lý báo cáo tuần"
 *   work-reports.configure  Quản trị              ADMIN /admin/work-report-settings "Báo cáo tuần › Cấu hình báo cáo tuần"
 *   (không quyền)           Ban Giám đốc, mọi người  PUBLIC /work-reports          "Báo cáo nhà máy › Báo cáo tuần" (chỉ xem)
 */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Submit int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'work-reports.submit');
DECLARE @Manage int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'work-reports.manage');
DECLARE @Configure int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'work-reports.configure');

IF @Submit IS NULL OR @Manage IS NULL OR @Configure IS NULL
BEGIN
    PRINT N'Chưa đủ 3 quyền work-reports.*: khởi động Server (bản mới) một lần để seeder thêm quyền rồi chạy lại script.';
    RETURN;
END

BEGIN TRANSACTION;

-- 1. MEMBER: trang của kỹ sư, gắn quyền submit (bản cũ của script tạo trang này không gắn quyền)
IF EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Area] = 'MEMBER' AND [Path] = '/member/work-reports')
BEGIN
    UPDATE [dbo].[Page] SET [PermissionId] = @Submit
    WHERE [Area] = 'MEMBER' AND [Path] = '/member/work-reports' AND ISNULL([PermissionId], 0) <> @Submit;
    PRINT N'Trang /member/work-reports: đã gắn quyền work-reports.submit';
END
ELSE
BEGIN
    INSERT INTO [dbo].[Page] ([Code], [Title], [Path], [Icon], [ParentId], [Area], [PermissionId], [SortOrder], [IsMenu], [IsActive])
    VALUES ('member-work-reports', N'Báo cáo công việc tuần', '/member/work-reports', 'CalendarOutlined', NULL, 'MEMBER', @Submit, 205, 1, 1);
    PRINT N'Đã thêm trang /member/work-reports (MEMBER)';
END

-- 2. ADMIN: nhóm menu "Báo cáo tuần"
DECLARE @GroupId int = (SELECT [Id] FROM [dbo].[Page] WHERE [Code] = 'work-reports');
IF @GroupId IS NULL
BEGIN
    INSERT INTO [dbo].[Page] ([Code], [Title], [Path], [Icon], [ParentId], [Area], [PermissionId], [SortOrder], [IsMenu], [IsActive])
    VALUES ('work-reports', N'Báo cáo tuần', NULL, 'CalendarOutlined', NULL, 'ADMIN', NULL, 60, 1, 1);
    SET @GroupId = SCOPE_IDENTITY();
    PRINT N'Đã thêm nhóm menu Báo cáo tuần (ADMIN)';
END

-- 3. ADMIN: Quản lý báo cáo tuần (đội trưởng/phó, quản đốc/phó)
IF EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Area] = 'ADMIN' AND [Path] = '/admin/work-reports')
    PRINT N'Trang /admin/work-reports đã có';
ELSE
BEGIN
    INSERT INTO [dbo].[Page] ([Code], [Title], [Path], [Icon], [ParentId], [Area], [PermissionId], [SortOrder], [IsMenu], [IsActive])
    VALUES ('admin-work-reports', N'Quản lý báo cáo tuần', '/admin/work-reports', 'CalendarOutlined', @GroupId, 'ADMIN', @Manage, 61, 1, 1);
    PRINT N'Đã thêm trang Quản lý báo cáo tuần (ADMIN)';
END

-- 4. ADMIN: Cấu hình báo cáo tuần (đưa vào nhóm nếu đã tạo bằng bản cũ của script)
IF EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Area] = 'ADMIN' AND [Path] = '/admin/work-report-settings')
BEGIN
    UPDATE [dbo].[Page] SET [ParentId] = @GroupId, [PermissionId] = @Configure, [SortOrder] = 62
    WHERE [Area] = 'ADMIN' AND [Path] = '/admin/work-report-settings';
    PRINT N'Trang /admin/work-report-settings: đã đưa vào nhóm Báo cáo tuần';
END
ELSE
BEGIN
    INSERT INTO [dbo].[Page] ([Code], [Title], [Path], [Icon], [ParentId], [Area], [PermissionId], [SortOrder], [IsMenu], [IsActive])
    VALUES ('work-report-settings', N'Cấu hình báo cáo tuần', '/admin/work-report-settings', 'ScheduleOutlined', @GroupId, 'ADMIN', @Configure, 62, 1, 1);
    PRINT N'Đã thêm trang Cấu hình báo cáo tuần (ADMIN)';
END

-- 5. PUBLIC: menu header "Báo cáo nhà máy › Báo cáo tuần" (ai cũng xem được, không cần đăng nhập)
IF EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Area] = 'PUBLIC' AND [Path] = '/work-reports')
    PRINT N'Trang /work-reports (PUBLIC) đã có';
ELSE
BEGIN
    DECLARE @ReportsGroupId int = (SELECT [Id] FROM [dbo].[Page] WHERE [Code] = 'public-reports' AND [Area] = 'PUBLIC');
    INSERT INTO [dbo].[Page] ([Code], [Title], [Path], [Icon], [ParentId], [Area], [PermissionId], [SortOrder], [IsMenu], [IsActive])
    VALUES ('public-work-reports', N'Báo cáo tuần', '/work-reports', NULL, @ReportsGroupId, 'PUBLIC', NULL, 123, 1, 1);
    PRINT N'Đã thêm trang /work-reports (PUBLIC)';
END

COMMIT TRANSACTION;
