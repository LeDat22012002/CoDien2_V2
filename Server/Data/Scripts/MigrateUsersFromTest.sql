/* =====================================================================================
   Chuyển tài khoản đăng nhập từ DB cũ TEST sang NM_CD2.
     TEST.dbo.Tbl_TaiKhoan → NM_CD2.dbo.[User] + dbo.UserRole
   - Ghép theo TenTaiKhoan = Employee.EmpCode. Tài khoản không có nhân viên tương ứng → bỏ qua (in danh sách).
   - Nhân viên đã có tài khoản (chưa xóa) → bỏ qua, giữ nguyên tài khoản và vai trò hiện có.
   - Mật khẩu: giữ hash MD5 cũ dạng "MD5:<hex>". UserPasswordHasher nhận hash này và đổi sang PBKDF2
     ở lần đăng nhập đầu tiên → người dùng đăng nhập bằng mật khẩu cũ.
   - Hash dùng chung cho nhiều tài khoản (mật khẩu mặc định) → MustChangePassword = 1 (chỉ gợi ý trên FE).
   - ID_TrangThai = 1 → IsActive = 1, còn lại → 0.
   - Mọi tài khoản chuyển sang nhận vai trò NGUOI_DUNG.
   - Chạy lại được: lần sau chỉ thêm tài khoản chưa có.
   - TEST dùng collation SQL_Latin1_General_CP1_CI_AS, NM_CD2 dùng Vietnamese_CI_AS → so sánh chuỗi có COLLATE.
   Chạy (bắt buộc -I vì bảng User có filtered index):
     sqlcmd -S <server> -U <user> -d NM_CD2 -C -I -f 65001 -i MigrateUsersFromTest.sql
   ===================================================================================== */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @RoleId int = (SELECT Id FROM dbo.Role WHERE Code = N'NGUOI_DUNG' AND IsDeleted = 0);
IF @RoleId IS NULL
    THROW 50301, N'Không tìm thấy vai trò NGUOI_DUNG trong dbo.Role.', 1;

DECLARE @Now datetime2 = SYSUTCDATETIME();

-- ===== Tài khoản cũ đã ghép nhân viên =====
SELECT t.ID_TaiKhoan,
       e.Id AS EmployeeId,
       LOWER(LTRIM(RTRIM(t.MatKhau))) COLLATE DATABASE_DEFAULT AS Md5Hex,
       CASE WHEN t.ID_TrangThai = 1 THEN 1 ELSE 0 END AS IsActive,
       COALESCE(CAST(t.NgayTao AS datetime2), @Now) AS CreatedAt,
       ROW_NUMBER() OVER (PARTITION BY e.Id ORDER BY t.ID_TaiKhoan DESC) AS Rn
INTO #Source
FROM TEST.dbo.Tbl_TaiKhoan t
JOIN dbo.Employee e ON e.EmpCode = LTRIM(RTRIM(t.TenTaiKhoan)) COLLATE DATABASE_DEFAULT
WHERE LEN(LTRIM(RTRIM(t.MatKhau))) = 32;

-- ===== Báo cáo các tài khoản bị bỏ qua =====
PRINT N'--- Không có nhân viên tương ứng hoặc mật khẩu không phải MD5 (bỏ qua) ---';
SELECT t.ID_TaiKhoan, t.TenTaiKhoan, t.HoVaTen, t.ID_TrangThai
FROM TEST.dbo.Tbl_TaiKhoan t
WHERE NOT EXISTS (SELECT 1 FROM #Source s WHERE s.ID_TaiKhoan = t.ID_TaiKhoan)
ORDER BY t.TenTaiKhoan;

PRINT N'--- Nhân viên đã có tài khoản (bỏ qua) ---';
SELECT e.EmpCode, e.FullName
FROM #Source s
JOIN dbo.Employee e ON e.Id = s.EmployeeId
WHERE s.Rn = 1 AND EXISTS (SELECT 1 FROM dbo.[User] u WHERE u.EmployeeId = s.EmployeeId AND u.IsDeleted = 0)
ORDER BY e.EmpCode;

BEGIN TRANSACTION;

CREATE TABLE #Inserted (UserId int PRIMARY KEY);

INSERT INTO dbo.[User] (EmployeeId, PasswordHash, IsActive, MustChangePassword, FailedLoginCount,
                        SecurityStamp, CreatedAt, CreatedBy, IsDeleted)
OUTPUT inserted.Id INTO #Inserted (UserId)
SELECT s.EmployeeId,
       N'MD5:' + s.Md5Hex,
       s.IsActive,
       CASE WHEN (SELECT COUNT(*) FROM #Source x WHERE x.Md5Hex = s.Md5Hex) > 1 THEN 1 ELSE 0 END,
       0,
       LOWER(REPLACE(CONVERT(varchar(36), NEWID()), '-', '')),
       s.CreatedAt,
       N'migration',
       0
FROM #Source s
WHERE s.Rn = 1
  AND NOT EXISTS (SELECT 1 FROM dbo.[User] u WHERE u.EmployeeId = s.EmployeeId AND u.IsDeleted = 0);

INSERT INTO dbo.UserRole (UserId, RoleId, AssignedAt, AssignedBy)
SELECT i.UserId, @RoleId, @Now, N'migration'
FROM #Inserted i;

COMMIT TRANSACTION;

DECLARE @Count int = (SELECT COUNT(*) FROM #Inserted);
PRINT CONCAT(N'Đã chuyển ', @Count, N' tài khoản, gán vai trò NGUOI_DUNG.');
