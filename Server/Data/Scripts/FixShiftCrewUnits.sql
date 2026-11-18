/*
 * Báo cáo tuần – sửa đơn vị báo cáo theo kíp (18/11/2026). Chạy 1 lần sau khi cập nhật Server; chạy lại không sao.
 *
 * Trước: nhóm "Kỹ sư Cơ điện - Theo ca" (OrgUnit SHIFT) thành 1 sheet giờ KIP, còn các tổ con
 *        "Tổ Cơ điện - … - Kíp A/B/C" (GROUP) thành sheet giờ HC.
 * Sau:   nhóm SHIFT không thành sheet (xóa mềm đơn vị, bỏ form trống); các tổ con dưới SHIFT là sheet giờ KIP.
 *        Kỹ sư theo ca (ở nhóm SHIFT) là gợi ý khi phân công kỹ sư cho các tổ kíp.
 *
 * An toàn: đơn vị SHIFT có form đã nhập dòng / vật tư thì KHÔNG đụng (in ra để xử lý tay).
 */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @ShiftMinutes decimal(18, 2) = (SELECT TOP 1 ShiftMinutesPerWeek FROM WorkReportSetting WHERE IsDeleted = 0);

-- 1. Đơn vị theo sơ đồ gắn với nhóm SHIFT
DECLARE @ShiftUnits TABLE (Id int PRIMARY KEY, HasData bit);
INSERT INTO @ShiftUnits (Id, HasData)
SELECT w.Id,
       CASE WHEN EXISTS (SELECT 1 FROM WeeklyForm f WHERE f.WorkReportUnitId = w.Id AND (
                    EXISTS (SELECT 1 FROM WorkPlanItem x WHERE x.WeeklyFormId = f.Id)
                 OR EXISTS (SELECT 1 FROM WorkReportItem x WHERE x.WeeklyFormId = f.Id)
                 OR EXISTS (SELECT 1 FROM WorkPlanMaterial x WHERE x.WeeklyFormId = f.Id)
                 OR EXISTS (SELECT 1 FROM WorkReportMaterial x WHERE x.WeeklyFormId = f.Id)))
            THEN 1 ELSE 0 END
FROM WorkReportUnit w
JOIN OrgUnit o ON o.Id = w.OrgUnitId
WHERE w.IsCustom = 0 AND o.TypeCode = 'SHIFT';

SELECT w.Id, w.DisplayName, N'Có dữ liệu – giữ nguyên, xử lý tay' AS Note
FROM @ShiftUnits s JOIN WorkReportUnit w ON w.Id = s.Id
WHERE s.HasData = 1 AND w.IsDeleted = 0;

DELETE c FROM WorkItemCodeCounter c
JOIN WeeklyForm f ON f.Id = c.WeeklyFormId
JOIN @ShiftUnits s ON s.Id = f.WorkReportUnitId AND s.HasData = 0;

DELETE f FROM WeeklyForm f
JOIN @ShiftUnits s ON s.Id = f.WorkReportUnitId AND s.HasData = 0;

-- Phân công kỹ sư của nhóm SHIFT: kết thúc (giữ lịch sử)
UPDATE e SET EndDate = DATEADD(day, -1, CAST(GETDATE() AS date))
FROM WorkReportUnitEngineer e
JOIN @ShiftUnits s ON s.Id = e.WorkReportUnitId AND s.HasData = 0
WHERE e.EndDate IS NULL OR e.EndDate >= CAST(GETDATE() AS date);

UPDATE w SET IsDeleted = 1
FROM WorkReportUnit w
JOIN @ShiftUnits s ON s.Id = w.Id AND s.HasData = 0
WHERE w.IsDeleted = 0;

PRINT N'Đã bỏ ' + CAST(@@ROWCOUNT AS nvarchar(10)) + N' đơn vị nhóm Kỹ sư theo ca';

-- 2. Tổ dưới nhóm SHIFT → giờ công KIP (cả đơn vị đã xóa, để khôi phục là đúng loại)
UPDATE w SET LaborType = 'KIP'
FROM WorkReportUnit w
JOIN OrgUnit o ON o.Id = w.OrgUnitId
JOIN OrgUnit p ON p.Id = o.ParentId
WHERE w.IsCustom = 0 AND o.TypeCode = 'GROUP' AND p.TypeCode = 'SHIFT' AND w.LaborType <> 'KIP';

PRINT N'Đã đổi ' + CAST(@@ROWCOUNT AS nvarchar(10)) + N' tổ kíp sang giờ công KIP';

-- Form của các tổ đó: chụp lại loại giờ công + giờ công/tuần
UPDATE f SET LaborType = 'KIP', CapacityMinutes = ISNULL(@ShiftMinutes, f.CapacityMinutes)
FROM WeeklyForm f
JOIN WorkReportUnit w ON w.Id = f.WorkReportUnitId
JOIN OrgUnit o ON o.Id = w.OrgUnitId
JOIN OrgUnit p ON p.Id = o.ParentId
WHERE w.IsCustom = 0 AND o.TypeCode = 'GROUP' AND p.TypeCode = 'SHIFT' AND f.LaborType <> 'KIP';

PRINT N'Đã cập nhật ' + CAST(@@ROWCOUNT AS nvarchar(10)) + N' form tổ kíp';

COMMIT TRANSACTION;
