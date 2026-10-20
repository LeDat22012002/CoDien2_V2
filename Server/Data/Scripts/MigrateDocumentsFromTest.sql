/* =====================================================================================
   Chuyển dữ liệu cấp số văn bản từ DB cũ TEST sang NM_CD2 (chạy 1 lần, sau migration AddDocuments).
     TEST.dbo.BieuMau        → NM_CD2.dbo.DocumentTemplate
     TEST.dbo.SoVanBanDaCap  → NM_CD2.dbo.IssuedDocument
   - Giữ nguyên Id, giữ nguyên giá trị (kể cả Ghi chú cũ).
   - CapNhatODiaChua: chua → PENDING, co → PUBLISHED, huy → CANCELLED.
   - Chỉ chạy khi 2 bảng đích còn trống; sai số dòng → rollback toàn bộ.
   Chạy: sqlcmd -S <server> -U <user> -d NM_CD2 -C -I -i MigrateDocumentsFromTest.sql
   ===================================================================================== */
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF EXISTS (SELECT 1 FROM dbo.DocumentTemplate) OR EXISTS (SELECT 1 FROM dbo.IssuedDocument)
    THROW 50101, N'Bảng DocumentTemplate / IssuedDocument đã có dữ liệu, dừng để tránh chuyển trùng.', 1;

IF EXISTS (SELECT 1 FROM TEST.dbo.SoVanBanDaCap WHERE ISNULL(CapNhatODiaChua, '') NOT IN ('chua', 'co', 'huy'))
    THROW 50102, N'Có giá trị CapNhatODiaChua ngoài chua / co / huy.', 1;

DECLARE @Now datetime2 = SYSUTCDATETIME();

BEGIN TRANSACTION;

SET IDENTITY_INSERT dbo.DocumentTemplate ON;
INSERT INTO dbo.DocumentTemplate
    (Id, Code, Name, NumberSuffix, Description, StartNumber, Process, CreatedAt, CreatedBy, IsDeleted)
SELECT b.Id,
       ISNULL(b.MaBieuMau, N''),
       ISNULL(b.TenBieuMau, N''),
       ISNULL(b.DuoiSoCoDinh, N''),
       b.MoTa,
       b.SoBatDau,
       b.QuyTrinh,
       @Now,
       N'migration',
       0
FROM TEST.dbo.BieuMau b;
SET IDENTITY_INSERT dbo.DocumentTemplate OFF;

SET IDENTITY_INSERT dbo.IssuedDocument ON;
INSERT INTO dbo.IssuedDocument
    (Id, DocumentTemplateId, SequenceNumber, [Year], DocumentNumber, IssuedAt, IssuerName, IssuerEmpCode, IssuerUnit,
     Subject, ContractNumber, IssueDate, Note, PublishStatus, EOfficeLink, CreatedAt, CreatedBy, IsDeleted)
SELECT s.Id,
       s.BieuMauId,
       ISNULL(s.SoThuTu, 0),
       ISNULL(s.Nam, 0),
       ISNULL(s.SoHieuVanBan, N''),
       ISNULL(s.NgayCap, @Now),
       ISNULL(s.HoTen, N''),
       ISNULL(s.MaNhanVien, N''),
       ISNULL(s.PhanXuong, N''),
       s.NoiDungTrichYeu,
       s.SoHopDong,
       ISNULL(s.NgayBanHanh, CAST(s.NgayCap AS date)),
       s.GhiChu,
       CASE s.CapNhatODiaChua WHEN 'co' THEN 'PUBLISHED' WHEN 'huy' THEN 'CANCELLED' ELSE 'PENDING' END,
       s.Linkeoffice,
       ISNULL(s.NgayCap, @Now),
       s.MaNhanVien,
       0
FROM TEST.dbo.SoVanBanDaCap s;
SET IDENTITY_INSERT dbo.IssuedDocument OFF;

-- Đối chiếu số dòng
DECLARE @OldTemplates int = (SELECT COUNT(*) FROM TEST.dbo.BieuMau);
DECLARE @NewTemplates int = (SELECT COUNT(*) FROM dbo.DocumentTemplate);
DECLARE @OldDocuments int = (SELECT COUNT(*) FROM TEST.dbo.SoVanBanDaCap);
DECLARE @NewDocuments int = (SELECT COUNT(*) FROM dbo.IssuedDocument);

IF @OldTemplates <> @NewTemplates OR @OldDocuments <> @NewDocuments
BEGIN
    ROLLBACK TRANSACTION;
    THROW 50103, N'Số dòng sau khi chuyển không khớp, đã rollback.', 1;
END;

COMMIT TRANSACTION;

SELECT @NewTemplates AS DocumentTemplates, @NewDocuments AS IssuedDocuments;
SELECT PublishStatus, COUNT(*) AS Cnt FROM dbo.IssuedDocument GROUP BY PublishStatus;
