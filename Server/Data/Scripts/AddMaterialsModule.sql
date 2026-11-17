/*
 * Module Danh mục vật tư (dbo.Material). Chạy lặp lại an toàn.
 *   sqlcmd -S <server> -d NM_CD2 -I -f 65001 -i Data/Scripts/AddMaterialsModule.sql
 *
 * Đơn vị tính dùng cột BOM có sẵn (entity map property Uom → cột BOM), không thêm cột mới.
 *
 * 1) Nếu đã lỡ chạy bản script cũ (có thêm cột Uom): xóa cột Uom khi cột này chưa có dữ liệu.
 * 2) Bảo đảm index IX_Material_Material trên cột Material.
 * 3) Thêm trang quản trị "Danh mục vật tư" (/admin/materials) vào menu Sider ADMIN.
 *    IdentitySeeder chỉ seed trang khi Area ADMIN chưa có trang nào nên DB đang dùng phải thêm bằng script này.
 *    Cần khởi động Server một lần trước để seeder thêm quyền materials.view / materials.manage.
 *    Người thấy menu: có materials.view (gán trên FE ở Phân quyền) hoặc SUPER_ADMIN.
 */
SET NOCOUNT ON;

/* ===== 1. Dọn cột Uom của bản script cũ (nếu có) ===== */
-- Dùng SQL động: khi cột Uom không tồn tại, viết thẳng tên cột sẽ lỗi biên dịch cả batch
IF COL_LENGTH(N'dbo.Material', N'Uom') IS NOT NULL
BEGIN
    DECLARE @UomHasData bit;
    EXEC sp_executesql
        N'SELECT @HasData = CASE WHEN EXISTS (SELECT 1 FROM [dbo].[Material] WHERE [Uom] IS NOT NULL AND [Uom] <> N'''') THEN 1 ELSE 0 END',
        N'@HasData bit OUTPUT',
        @HasData = @UomHasData OUTPUT;

    IF @UomHasData = 1
        PRINT N'CẢNH BÁO: cột dbo.Material.Uom đang có dữ liệu – không tự xóa. Chép sang BOM (nếu cần) rồi xóa cột bằng tay.';
    ELSE
    BEGIN
        EXEC (N'ALTER TABLE [dbo].[Material] DROP COLUMN [Uom]');
        PRINT N'Đã xóa cột dbo.Material.Uom (đơn vị tính dùng cột BOM)';
    END
END

/* ===== 2. Index trên cột Material ===== */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE [object_id] = OBJECT_ID(N'dbo.Material') AND [name] = N'IX_Material_Material')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Material_Material] ON [dbo].[Material] ([Material] ASC);
    PRINT N'Đã tạo index IX_Material_Material';
END

/* ===== 3. Trang quản trị ===== */
DECLARE @PermissionId int = (SELECT [Id] FROM [dbo].[Permission] WHERE [Code] = 'materials.view');

IF @PermissionId IS NULL
BEGIN
    PRINT N'Chưa có quyền materials.view: khởi động Server một lần để seeder thêm quyền rồi chạy lại';
    RETURN;
END

IF EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Code] = 'materials')
   OR EXISTS (SELECT 1 FROM [dbo].[Page] WHERE [Area] = 'ADMIN' AND [Path] = '/admin/materials')
BEGIN
    PRINT N'Trang /admin/materials đã có';
    RETURN;
END

INSERT INTO [dbo].[Page] ([Code], [Title], [Path], [Icon], [ParentId], [Area], [PermissionId], [SortOrder], [IsMenu], [IsActive])
VALUES ('materials', N'Danh mục vật tư', '/admin/materials', 'AppstoreOutlined', NULL, 'ADMIN', @PermissionId, 51, 1, 1);

PRINT N'Đã thêm trang Danh mục vật tư';