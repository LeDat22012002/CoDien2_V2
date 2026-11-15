using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkReportsForms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WeeklyForm",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkReportUnitId = table.Column<int>(type: "int", nullable: false),
                    WorkWeekId = table.Column<int>(type: "int", nullable: false),
                    WorkshopId = table.Column<int>(type: "int", nullable: false),
                    UnitName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CodePrefix = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    LaborType = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    CapacityMinutes = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    EngineerNames = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PlanLockedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReportLockedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PlanUnlockedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReportUnlockedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyForm", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeeklyForm_WorkReportUnit_WorkReportUnitId",
                        column: x => x.WorkReportUnitId,
                        principalSchema: "dbo",
                        principalTable: "WorkReportUnit",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WeeklyForm_WorkWeek_WorkWeekId",
                        column: x => x.WorkWeekId,
                        principalSchema: "dbo",
                        principalTable: "WorkWeek",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkItemCodeCounter",
                schema: "dbo",
                columns: table => new
                {
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false),
                    WorkCategoryId = table.Column<int>(type: "int", nullable: false),
                    LastSeq = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkItemCodeCounter", x => new { x.WeeklyFormId, x.WorkCategoryId });
                });

            migrationBuilder.CreateTable(
                name: "WorkItem",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false),
                    WorkCategoryId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CodeSeq = table.Column<int>(type: "int", nullable: false),
                    EquipmentId = table.Column<int>(type: "int", nullable: true),
                    EquipmentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EquipmentName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    WorkDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PlannedMinutes = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    ActualMinutes = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    ResultPercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    WorkPermit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    FiveS = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Explanation = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsUnplanned = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
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
                    EmployeeId = table.Column<int>(type: "int", nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
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
                    WeeklyFormId = table.Column<int>(type: "int", nullable: false),
                    WorkItemId = table.Column<int>(type: "int", nullable: false),
                    MaterialCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MaterialName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Uom = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PlannedQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    ActualQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    UsageDate = table.Column<DateOnly>(type: "date", nullable: true),
                    MaterialPurposeId = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsUnplanned = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
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
                name: "IX_WeeklyForm_WorkReportUnitId_WorkWeekId",
                schema: "dbo",
                table: "WeeklyForm",
                columns: new[] { "WorkReportUnitId", "WorkWeekId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyForm_WorkWeekId_WorkshopId",
                schema: "dbo",
                table: "WeeklyForm",
                columns: new[] { "WorkWeekId", "WorkshopId" });

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkItemCodeCounter",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkItemWorker",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkMaterial",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkItem",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WeeklyForm",
                schema: "dbo");
        }
    }
}
