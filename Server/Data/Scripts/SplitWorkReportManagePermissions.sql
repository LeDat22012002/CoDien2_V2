/*
 * Tách quyền báo cáo tuần (17/11/2026): phân công kỹ sư và mở khóa thành 2 quyền riêng.
 *   work-reports.assign-engineers  Phân công kỹ sư (trước nằm trong work-reports.manage)
 *   work-reports.unlock            Mở khóa kế hoạch / báo cáo quá hạn (trước nằm trong work-reports.configure)
 *
 * Script cấp sẵn quyền mới cho role đang có quyền cũ để không ai mất chức năng đang dùng:
 *   role có manage    → thêm assign-engineers
 *   role có configure → thêm unlock (và assign-engineers: admin vẫn phân công được mọi xưởng)
 * Sau đó admin bỏ bớt trên FE (Quản trị hệ thống → Phân quyền) nếu muốn tách người.
 * Cũng đổi tên hiển thị của manage / configure (seeder không sửa tên quyền đã có).
 *
 * Trước khi chạy: khởi động Server (bản mới) 1 lần để seeder thêm 2 mã quyền mới (script dừng nếu thiếu).
 * CHỈ CHẠY 1 LẦN: chạy lại sẽ cấp lại quyền admin đã bỏ.
 *   sqlcmd -S <server> -d NM_CD2 -I -f 65001 -i Data/Scripts/SplitWorkReportManagePermissions.sql
 */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Manage int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'work-reports.manage');
DECLARE @Configure int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'work-reports.configure');
DECLARE @AssignEngineers int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'work-reports.assign-engineers');
DECLARE @Unlock int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'work-reports.unlock');

IF @Manage IS NULL OR @Configure IS NULL OR @AssignEngineers IS NULL OR @Unlock IS NULL
BEGIN
    PRINT N'Chưa đủ quyền work-reports.*: khởi động Server (bản mới) một lần để seeder thêm quyền rồi chạy lại script.';
    RETURN;
END

BEGIN TRANSACTION;

-- 1. assign-engineers cho role có manage hoặc configure
INSERT INTO [dbo].[RolePermission] ([RoleId], [PermissionId])
SELECT DISTINCT rp.[RoleId], @AssignEngineers
FROM [dbo].[RolePermission] rp
WHERE rp.[PermissionId] IN (@Manage, @Configure)
  AND NOT EXISTS (SELECT 1 FROM [dbo].[RolePermission] x
                  WHERE x.[RoleId] = rp.[RoleId] AND x.[PermissionId] = @AssignEngineers);
PRINT N'Đã cấp work-reports.assign-engineers cho ' + CAST(@@ROWCOUNT AS nvarchar(10)) + N' role';

-- 2. unlock cho role có configure
INSERT INTO [dbo].[RolePermission] ([RoleId], [PermissionId])
SELECT rp.[RoleId], @Unlock
FROM [dbo].[RolePermission] rp
WHERE rp.[PermissionId] = @Configure
  AND NOT EXISTS (SELECT 1 FROM [dbo].[RolePermission] x
                  WHERE x.[RoleId] = rp.[RoleId] AND x.[PermissionId] = @Unlock);
PRINT N'Đã cấp work-reports.unlock cho ' + CAST(@@ROWCOUNT AS nvarchar(10)) + N' role';

-- 3. Tên hiển thị mới (chỉ khi còn tên mặc định cũ, không ghi đè tên admin đã sửa)
UPDATE [dbo].[Permission]
SET [Name] = N'Quản lý báo cáo tuần của đội/xưởng (xem, cấu hình tổ/kíp)'
WHERE [Id] = @Manage AND [Name] = N'Quản lý báo cáo tuần của đội/xưởng (cấu hình tổ/kíp, phân công kỹ sư)';

UPDATE [dbo].[Permission]
SET [Name] = N'Cấu hình báo cáo tuần (đầu mục, hạn nộp, giờ công)'
WHERE [Id] = @Configure AND [Name] = N'Cấu hình báo cáo tuần (đầu mục, hạn nộp, giờ công, mở khóa)';

COMMIT TRANSACTION;
