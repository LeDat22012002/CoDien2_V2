using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class SplitWorkPlanReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkPlanItem",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlannedMinutes = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false),
                    WorkCategoryId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CodeSeq = table.Column<int>(type: "int", nullable: false),
                    EquipmentId = table.Column<int>(type: "int", nullable: true),
                    EquipmentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EquipmentName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkPlanItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkPlanItem_WeeklyForm_WeeklyFormId",
                        column: x => x.WeeklyFormId,
                        principalSchema: "dbo",
                        principalTable: "WeeklyForm",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkPlanItem_WorkCategory_WorkCategoryId",
                        column: x => x.WorkCategoryId,
                        principalSchema: "dbo",
                        principalTable: "WorkCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkReportItem",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanItemId = table.Column<int>(type: "int", nullable: true),
                    PlannedMinutes = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    ActualMinutes = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    ResultPercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    WorkPermit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    FiveS = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Explanation = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false),
                    WorkCategoryId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CodeSeq = table.Column<int>(type: "int", nullable: false),
                    EquipmentId = table.Column<int>(type: "int", nullable: true),
                    EquipmentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EquipmentName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkReportItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkReportItem_WeeklyForm_WeeklyFormId",
                        column: x => x.WeeklyFormId,
                        principalSchema: "dbo",
                        principalTable: "WeeklyForm",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkReportItem_WorkCategory_WorkCategoryId",
                        column: x => x.WorkCategoryId,
                        principalSchema: "dbo",
                        principalTable: "WorkCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkPlanItemWorker",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkPlanItemId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkPlanItemWorker", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkPlanItemWorker_WorkPlanItem_WorkPlanItemId",
                        column: x => x.WorkPlanItemId,
                        principalSchema: "dbo",
                        principalTable: "WorkPlanItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkPlanMaterial",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkPlanItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false),
                    MaterialCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MaterialName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Uom = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    UsageDate = table.Column<DateOnly>(type: "date", nullable: true),
                    MaterialPurposeId = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkPlanMaterial", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkPlanMaterial_MaterialPurpose_MaterialPurposeId",
                        column: x => x.MaterialPurposeId,
                        principalSchema: "dbo",
                        principalTable: "MaterialPurpose",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkPlanMaterial_WorkPlanItem_WorkPlanItemId",
                        column: x => x.WorkPlanItemId,
                        principalSchema: "dbo",
                        principalTable: "WorkPlanItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkReportItemWorker",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkReportItemId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkReportItemWorker", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkReportItemWorker_WorkReportItem_WorkReportItemId",
                        column: x => x.WorkReportItemId,
                        principalSchema: "dbo",
                        principalTable: "WorkReportItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkReportMaterial",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkReportItemId = table.Column<int>(type: "int", nullable: false),
                    PlanMaterialId = table.Column<int>(type: "int", nullable: true),
                    PlannedQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    ActualQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false),
                    MaterialCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MaterialName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Uom = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    UsageDate = table.Column<DateOnly>(type: "date", nullable: true),
                    MaterialPurposeId = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkReportMaterial", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkReportMaterial_MaterialPurpose_MaterialPurposeId",
                        column: x => x.MaterialPurposeId,
                        principalSchema: "dbo",
                        principalTable: "MaterialPurpose",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkReportMaterial_WorkReportItem_WorkReportItemId",
                        column: x => x.WorkReportItemId,
                        principalSchema: "dbo",
                        principalTable: "WorkReportItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkPlanItem_Code",
                schema: "dbo",
                table: "WorkPlanItem",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_WorkPlanItem_WeeklyFormId",
                schema: "dbo",
                table: "WorkPlanItem",
                column: "WeeklyFormId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkPlanItem_WorkCategoryId",
                schema: "dbo",
                table: "WorkPlanItem",
                column: "WorkCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkPlanItemWorker_EmployeeId",
                schema: "dbo",
                table: "WorkPlanItemWorker",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkPlanItemWorker_WorkPlanItemId",
                schema: "dbo",
                table: "WorkPlanItemWorker",
                column: "WorkPlanItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkPlanMaterial_MaterialPurposeId",
                schema: "dbo",
                table: "WorkPlanMaterial",
                column: "MaterialPurposeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkPlanMaterial_WeeklyFormId",
                schema: "dbo",
                table: "WorkPlanMaterial",
                column: "WeeklyFormId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkPlanMaterial_WorkPlanItemId",
                schema: "dbo",
                table: "WorkPlanMaterial",
                column: "WorkPlanItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportItem_Code",
                schema: "dbo",
                table: "WorkReportItem",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportItem_PlanItemId",
                schema: "dbo",
                table: "WorkReportItem",
                column: "PlanItemId",
                unique: true,
                filter: "[IsDeleted] = 0 AND [PlanItemId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportItem_WeeklyFormId",
                schema: "dbo",
                table: "WorkReportItem",
                column: "WeeklyFormId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportItem_WorkCategoryId",
                schema: "dbo",
                table: "WorkReportItem",
                column: "WorkCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportItemWorker_EmployeeId",
                schema: "dbo",
                table: "WorkReportItemWorker",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportItemWorker_WorkReportItemId",
                schema: "dbo",
                table: "WorkReportItemWorker",
                column: "WorkReportItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportMaterial_MaterialPurposeId",
                schema: "dbo",
                table: "WorkReportMaterial",
                column: "MaterialPurposeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportMaterial_WeeklyFormId",
                schema: "dbo",
                table: "WorkReportMaterial",
                column: "WeeklyFormId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportMaterial_WorkReportItemId",
                schema: "dbo",
                table: "WorkReportMaterial",
                column: "WorkReportItemId");

            // Chép dữ liệu bảng chung cũ sang 2 bảng mới rồi mới xóa bảng cũ
            migrationBuilder.Sql(CopyDataSql);

            migrationBuilder.DropTable(
                name: "WorkItemWorker",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkMaterial",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkItem",
                schema: "dbo");
        }

        /// <summary>
        /// - Kế hoạch: dòng không phát sinh (giữ nguyên Id), người thực hiện, vật tư kế hoạch (giữ nguyên Id); WorkDate → StartDate = EndDate.
        /// - Báo cáo: dòng phát sinh + dòng kế hoạch đã nhập số liệu thực hiện (giờ thực tế, kết quả, GPLV, 5S, diễn giải, vật tư thực tế);
        ///   dòng kế hoạch chưa nhập gì để lại làm gợi ý. Chỉ chép dòng chưa xóa.
        /// </summary>
        private const string CopyDataSql = """
            SET IDENTITY_INSERT [dbo].[WorkPlanItem] ON;
            INSERT INTO [dbo].[WorkPlanItem] ([Id], [WeeklyFormId], [WorkCategoryId], [Code], [CodeSeq], [EquipmentId], [EquipmentCode],
                [EquipmentName], [Description], [StartDate], [EndDate], [PlannedMinutes], [Note], [SortOrder],
                [CreatedAt], [CreatedBy], [UpdatedAt], [UpdatedBy], [IsDeleted])
            SELECT [Id], [WeeklyFormId], [WorkCategoryId], [Code], [CodeSeq], [EquipmentId], [EquipmentCode],
                [EquipmentName], [Description], [WorkDate], [WorkDate], [PlannedMinutes], [Note], [SortOrder],
                [CreatedAt], [CreatedBy], [UpdatedAt], [UpdatedBy], 0
            FROM [dbo].[WorkItem]
            WHERE [IsDeleted] = 0 AND [IsUnplanned] = 0;
            SET IDENTITY_INSERT [dbo].[WorkPlanItem] OFF;

            INSERT INTO [dbo].[WorkPlanItemWorker] ([WorkPlanItemId], [EmployeeId], [DisplayName], [SortOrder])
            SELECT w.[WorkItemId], w.[EmployeeId], w.[DisplayName], w.[SortOrder]
            FROM [dbo].[WorkItemWorker] w
            INNER JOIN [dbo].[WorkPlanItem] p ON p.[Id] = w.[WorkItemId];

            SET IDENTITY_INSERT [dbo].[WorkPlanMaterial] ON;
            INSERT INTO [dbo].[WorkPlanMaterial] ([Id], [WeeklyFormId], [WorkPlanItemId], [MaterialCode], [MaterialName], [Uom],
                [Quantity], [UsageDate], [MaterialPurposeId], [Note], [CreatedAt], [CreatedBy], [UpdatedAt], [UpdatedBy], [IsDeleted])
            SELECT m.[Id], m.[WeeklyFormId], m.[WorkItemId], m.[MaterialCode], m.[MaterialName], m.[Uom],
                m.[PlannedQuantity], m.[UsageDate], m.[MaterialPurposeId], m.[Note], m.[CreatedAt], m.[CreatedBy], m.[UpdatedAt], m.[UpdatedBy], 0
            FROM [dbo].[WorkMaterial] m
            INNER JOIN [dbo].[WorkPlanItem] p ON p.[Id] = m.[WorkItemId]
            WHERE m.[IsDeleted] = 0 AND m.[IsUnplanned] = 0;
            SET IDENTITY_INSERT [dbo].[WorkPlanMaterial] OFF;

            DECLARE @Map TABLE ([OldId] int PRIMARY KEY, [NewId] int NOT NULL);

            MERGE [dbo].[WorkReportItem] AS t
            USING (
                SELECT i.*
                FROM [dbo].[WorkItem] i
                WHERE i.[IsDeleted] = 0
                  AND (i.[IsUnplanned] = 1 OR i.[ActualMinutes] IS NOT NULL OR i.[ResultPercent] IS NOT NULL
                       OR i.[WorkPermit] IS NOT NULL OR i.[FiveS] IS NOT NULL OR i.[Explanation] IS NOT NULL
                       OR EXISTS (SELECT 1 FROM [dbo].[WorkMaterial] m
                                  WHERE m.[WorkItemId] = i.[Id] AND m.[IsDeleted] = 0
                                    AND (m.[IsUnplanned] = 1 OR m.[ActualQuantity] IS NOT NULL)))
            ) AS s ON 1 = 0
            WHEN NOT MATCHED THEN
                INSERT ([WeeklyFormId], [WorkCategoryId], [PlanItemId], [Code], [CodeSeq], [EquipmentId], [EquipmentCode],
                    [EquipmentName], [Description], [StartDate], [EndDate], [PlannedMinutes], [ActualMinutes], [ResultPercent],
                    [WorkPermit], [FiveS], [Explanation], [Note], [SortOrder], [CreatedAt], [CreatedBy], [UpdatedAt], [UpdatedBy], [IsDeleted])
                VALUES (s.[WeeklyFormId], s.[WorkCategoryId], CASE WHEN s.[IsUnplanned] = 1 THEN NULL ELSE s.[Id] END, s.[Code], s.[CodeSeq],
                    s.[EquipmentId], s.[EquipmentCode], s.[EquipmentName], s.[Description], s.[WorkDate], s.[WorkDate],
                    CASE WHEN s.[IsUnplanned] = 1 THEN NULL ELSE s.[PlannedMinutes] END, s.[ActualMinutes], s.[ResultPercent],
                    s.[WorkPermit], s.[FiveS], s.[Explanation], s.[Note], s.[SortOrder], s.[CreatedAt], s.[CreatedBy],
                    s.[UpdatedAt], s.[UpdatedBy], 0)
            OUTPUT s.[Id], inserted.[Id] INTO @Map ([OldId], [NewId]);

            INSERT INTO [dbo].[WorkReportItemWorker] ([WorkReportItemId], [EmployeeId], [DisplayName], [SortOrder])
            SELECT map.[NewId], w.[EmployeeId], w.[DisplayName], w.[SortOrder]
            FROM [dbo].[WorkItemWorker] w
            INNER JOIN @Map map ON map.[OldId] = w.[WorkItemId];

            INSERT INTO [dbo].[WorkReportMaterial] ([WeeklyFormId], [WorkReportItemId], [PlanMaterialId], [MaterialCode], [MaterialName],
                [Uom], [PlannedQuantity], [ActualQuantity], [UsageDate], [MaterialPurposeId], [Note],
                [CreatedAt], [CreatedBy], [UpdatedAt], [UpdatedBy], [IsDeleted])
            SELECT m.[WeeklyFormId], map.[NewId], pm.[Id], m.[MaterialCode], m.[MaterialName],
                m.[Uom], pm.[Quantity], m.[ActualQuantity], m.[UsageDate], m.[MaterialPurposeId], m.[Note],
                m.[CreatedAt], m.[CreatedBy], m.[UpdatedAt], m.[UpdatedBy], 0
            FROM [dbo].[WorkMaterial] m
            INNER JOIN @Map map ON map.[OldId] = m.[WorkItemId]
            LEFT JOIN [dbo].[WorkPlanMaterial] pm ON pm.[Id] = m.[Id]
            WHERE m.[IsDeleted] = 0;
            """;

        /// <inheritdoc />
        /// <remarks>Chỉ dựng lại cấu trúc bảng cũ, không chép ngược dữ liệu.</remarks>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkPlanItemWorker",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkPlanMaterial",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkReportItemWorker",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkReportMaterial",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkPlanItem",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkReportItem",
                schema: "dbo");

            migrationBuilder.CreateTable(
                name: "WorkItem",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false),
                    WorkCategoryId = table.Column<int>(type: "int", nullable: false),
                    ActualMinutes = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CodeSeq = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    EquipmentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EquipmentId = table.Column<int>(type: "int", nullable: true),
                    EquipmentName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Explanation = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FiveS = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    IsUnplanned = table.Column<bool>(type: "bit", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PlannedMinutes = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    ResultPercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    WorkDate = table.Column<DateOnly>(type: "date", nullable: false),
                    WorkPermit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkItem_WeeklyForm_WeeklyFormId",
                        column: x => x.WeeklyFormId,
                        principalSchema: "dbo",
                        principalTable: "WeeklyForm",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkItem_WorkCategory_WorkCategoryId",
                        column: x => x.WorkCategoryId,
                        principalSchema: "dbo",
                        principalTable: "WorkCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkItemWorker",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkItemId = table.Column<int>(type: "int", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkItemWorker", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkItemWorker_WorkItem_WorkItemId",
                        column: x => x.WorkItemId,
                        principalSchema: "dbo",
                        principalTable: "WorkItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkMaterial",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaterialPurposeId = table.Column<int>(type: "int", nullable: true),
                    WorkItemId = table.Column<int>(type: "int", nullable: false),
                    ActualQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    IsUnplanned = table.Column<bool>(type: "bit", nullable: false),
                    MaterialCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MaterialName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PlannedQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    Uom = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UsageDate = table.Column<DateOnly>(type: "date", nullable: true),
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkMaterial", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkMaterial_MaterialPurpose_MaterialPurposeId",
                        column: x => x.MaterialPurposeId,
                        principalSchema: "dbo",
                        principalTable: "MaterialPurpose",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkMaterial_WorkItem_WorkItemId",
                        column: x => x.WorkItemId,
                        principalSchema: "dbo",
                        principalTable: "WorkItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkItem_Code",
                schema: "dbo",
                table: "WorkItem",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItem_WeeklyFormId",
                schema: "dbo",
                table: "WorkItem",
                column: "WeeklyFormId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItem_WorkCategoryId",
                schema: "dbo",
                table: "WorkItem",
                column: "WorkCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItemWorker_EmployeeId",
                schema: "dbo",
                table: "WorkItemWorker",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItemWorker_WorkItemId",
                schema: "dbo",
                table: "WorkItemWorker",
                column: "WorkItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkMaterial_MaterialPurposeId",
                schema: "dbo",
                table: "WorkMaterial",
                column: "MaterialPurposeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkMaterial_WeeklyFormId",
                schema: "dbo",
                table: "WorkMaterial",
                column: "WeeklyFormId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkMaterial_WorkItemId",
                schema: "dbo",
                table: "WorkMaterial",
                column: "WorkItemId");
        }
    }
}
