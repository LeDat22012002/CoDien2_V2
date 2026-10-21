/* =====================================================================================
   Chuyển danh mục thiết bị và báo cáo sự cố từ DB cũ TEST sang NM_CD2
   (chạy 1 lần, sau migration AddEquipmentsAndIncidents).
     TEST.dbo.Equipment   → NM_CD2.dbo.Equipment
     TEST.dbo.BaoCaoSuCo  → NM_CD2.dbo.Incident
   - Giữ nguyên Id.
   - Equipment cũ có mã bị lặp (do import nhiều lần, các bản trùng giống hệt nhau) → mỗi mã giữ Id nhỏ nhất.
   - Xưởng: TEST.dbo.Tbl_Xuong.ID_Xuong → OrgUnit cấp 1 theo bảng ánh xạ #WorkshopMap bên dưới (theo OrgUnit.Code).
   - Người nhập: IdNguoiNhap → TEST.dbo.Tbl_TaiKhoan.TenTaiKhoan (= Employee.EmpCode), họ tên lấy từ Employee.
   - TEST dùng collation SQL_Latin1_General_CP1_CI_AS, NM_CD2 dùng Vietnamese_CI_AS → so sánh chuỗi có COLLATE.
   - Chỉ chạy khi 2 bảng đích còn trống; sai số dòng → rollback toàn bộ.
   Chạy (bắt buộc -f 65001 vì mã đơn vị có chữ "Đ"):
     sqlcmd -S <server> -U <user> -d NM_CD2 -C -I -f 65001 -i MigrateIncidentsFromTest.sql
   ===================================================================================== */
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF EXISTS (SELECT 1 FROM dbo.Equipment) OR EXISTS (SELECT 1 FROM dbo.Incident)
    THROW 50201, N'Bảng Equipment / Incident đã có dữ liệu, dừng để tránh chuyển trùng.', 1;

-- ===== Ánh xạ xưởng cũ → đơn vị cấp 1 (sửa tại đây nếu sơ đồ tổ chức đổi mã) =====
CREATE TABLE #WorkshopMap (OldId int PRIMARY KEY, OrgUnitCode nvarchar(50) COLLATE DATABASE_DEFAULT NOT NULL);
INSERT INTO #WorkshopMap (OldId, OrgUnitCode) VALUES
    (178, N'X.CĐNĐ2'),   -- X. CĐ NĐ2
    (179, N'X.CĐLG1'),   -- X.CĐ LG1
    (180, N'X.CĐLG2'),   -- X.CĐ LG2
    (181, N'X.CĐNĐ1'),   -- X. CĐ NĐ1
    (182, N'X.CĐNL');    -- X.CĐ XLN-110kV

IF EXISTS (
    SELECT 1 FROM #WorkshopMap m
    WHERE NOT EXISTS (SELECT 1 FROM dbo.OrgUnit u WHERE u.Code = m.OrgUnitCode))
    THROW 50202, N'#WorkshopMap có mã đơn vị không tồn tại trong dbo.OrgUnit.', 1;

IF EXISTS (
    SELECT 1 FROM TEST.dbo.BaoCaoSuCo b
    WHERE b.IdXuong IS NOT NULL AND NOT EXISTS (SELECT 1 FROM #WorkshopMap m WHERE m.OldId = b.IdXuong))
    THROW 50203, N'Có IdXuong trong BaoCaoSuCo chưa được ánh xạ trong #WorkshopMap.', 1;

DECLARE @Now datetime2 = SYSUTCDATETIME();

BEGIN TRANSACTION;

-- ===== Thiết bị =====
SET IDENTITY_INSERT dbo.Equipment ON;
INSERT INTO dbo.Equipment (Id, Code, Name, CreatedAt, CreatedBy, IsDeleted)
SELECT e.id,
       LTRIM(RTRIM(e.MaEquipment)),
       e.Name,
       @Now,
       N'migration',
       0
FROM TEST.dbo.Equipment e
WHERE e.id IN (
    SELECT MIN(x.id)
    FROM TEST.dbo.Equipment x
    GROUP BY LTRIM(RTRIM(x.MaEquipment)) COLLATE DATABASE_DEFAULT);
SET IDENTITY_INSERT dbo.Equipment OFF;

-- ===== Báo cáo sự cố =====
SET IDENTITY_INSERT dbo.Incident ON;
INSERT INTO dbo.Incident
    (Id, WorkshopId, Shift, EquipmentCode, EquipmentName, DeviceName,
     ReceivedAt, RepairStartedAt, RepairFinishedAt, HandedOverAt,
     IncidentType, StopLevel, AffectsProduction, Description, Solution, Result, Note,
     Cause, RootCause, CorrectiveAction, ReportedAt, ReporterEmpCode, ReporterName,
     OrderNumber, ReportLink, CreatedAt, CreatedBy, IsDeleted)
SELECT b.Id,
       u.Id,
       ISNULL(b.Kip, N''),
       ISNULL(b.MaEq, N''),
       ISNULL(b.NameEq, N''),
       b.TenThietBi,
       b.TDNTT,
       b.TDBDSC,
       b.TDSCX,
       b.TDBG,
       ISNULL(b.LoaiSuCo, N''),
       ISNULL(b.DungDenCap, N''),
       ISNULL(b.AHSX, 0),
       b.MoTaSuCo,
       b.PAXL,
       CAST(b.KetQua AS decimal(18, 4)),
       b.GhiChu,
       b.NguyenNhan,
       b.NguyenNhanGoc,
       b.HanhDong,
       b.ThoiGianNhap,
       e.EmpCode,
       e.FullName,
       b.SoOrder,
       b.LinkBienBan,
       ISNULL(b.ThoiGianNhap, @Now),
       ISNULL(e.EmpCode, N'migration'),
       0
FROM TEST.dbo.BaoCaoSuCo b
LEFT JOIN #WorkshopMap m ON m.OldId = b.IdXuong
LEFT JOIN dbo.OrgUnit u ON u.Code = m.OrgUnitCode
LEFT JOIN TEST.dbo.Tbl_TaiKhoan t ON t.ID_TaiKhoan = b.IdNguoiNhap
LEFT JOIN dbo.Employee e ON e.EmpCode = t.TenTaiKhoan COLLATE DATABASE_DEFAULT;
SET IDENTITY_INSERT dbo.Incident OFF;

-- ===== Đối chiếu số dòng =====
DECLARE @OldEquipmentCodes int = (
    SELECT COUNT(*) FROM (
        SELECT 1 AS x FROM TEST.dbo.Equipment GROUP BY LTRIM(RTRIM(MaEquipment)) COLLATE DATABASE_DEFAULT) d);
DECLARE @NewEquipments int = (SELECT COUNT(*) FROM dbo.Equipment);
DECLARE @OldIncidents int = (SELECT COUNT(*) FROM TEST.dbo.BaoCaoSuCo);
DECLARE @NewIncidents int = (SELECT COUNT(*) FROM dbo.Incident);

IF @OldEquipmentCodes <> @NewEquipments OR @OldIncidents <> @NewIncidents
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50204, N'Số dòng sau khi chuyển không khớp, đã rollback.', 1;
END;

COMMIT TRANSACTION;

SELECT (SELECT COUNT(*) FROM TEST.dbo.Equipment) AS OldEquipmentRows,
       @NewEquipments AS Equipments,
       @NewIncidents AS Incidents,
       (SELECT COUNT(*) FROM dbo.Incident WHERE ReporterEmpCode IS NOT NULL) AS IncidentsWithReporter,
       (SELECT COUNT(*) FROM TEST.dbo.BaoCaoSuCo WHERE IdNguoiNhap IS NOT NULL) AS OldIncidentsWithReporter;
SELECT u.Name AS Workshop, COUNT(*) AS Cnt
FROM dbo.Incident i LEFT JOIN dbo.OrgUnit u ON u.Id = i.WorkshopId
GROUP BY u.Name;

DROP TABLE #WorkshopMap;
