/*
 * Đổi User.LastLoginAt đã lưu theo UTC sang giờ Việt Nam (+7). CHỈ CHẠY 1 LẦN,
 * sau khi deploy bản AuthService lưu LastLoginAt = DateTime.Now và TRƯỚC khi có lượt đăng nhập mới
 * (chạy lại hoặc chạy muộn sẽ cộng thêm 7 giờ cho giá trị đã đúng).
 *   sqlcmd -S <server> -d NM_CD2 -I -f 65001 -i Data/Scripts/ConvertLastLoginToLocalTime.sql
 */
SET NOCOUNT ON;

UPDATE [dbo].[User]
SET [LastLoginAt] = DATEADD(HOUR, 7, [LastLoginAt])
WHERE [LastLoginAt] IS NOT NULL;

PRINT N'Đã đổi ' + CAST(@@ROWCOUNT AS nvarchar(20)) + N' tài khoản sang giờ Việt Nam';
