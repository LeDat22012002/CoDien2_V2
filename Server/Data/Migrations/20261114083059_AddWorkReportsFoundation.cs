using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkReportsFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaterialPurpose",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialPurpose", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkCategory",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    GroupLetter = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CodeSuffix = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ShowInSummary = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkCategory", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkReportSetting",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HcMinutesPerWeek = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ShiftMinutesPerWeek = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DeadlineDayOffset = table.Column<int>(type: "int", nullable: false),
                    DeadlineTime = table.Column<TimeOnly>(type: "time", nullable: false),
                    WarnDaysBefore = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkReportSetting", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkReportUnit",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrgUnitId = table.Column<int>(type: "int", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CodePrefix = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    LaborType = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkReportUnit", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkWeek",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IsoYear = table.Column<int>(type: "int", nullable: false),
                    IsoWeek = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    LabelMonth = table.Column<int>(type: "int", nullable: false),
                    LabelYear = table.Column<int>(type: "int", nullable: false),
                    PlanDeadlineAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReportDeadlineAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeadlineCustomized = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkWeek", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkCategoryWorkshop",
                schema: "dbo",
                columns: table => new
                {
                    WorkCategoryId = table.Column<int>(type: "int", nullable: false),
                    WorkshopId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkCategoryWorkshop", x => new { x.WorkCategoryId, x.WorkshopId });
                    table.ForeignKey(
                        name: "FK_WorkCategoryWorkshop_WorkCategory_WorkCategoryId",
                        column: x => x.WorkCategoryId,
                        principalSchema: "dbo",
                        principalTable: "WorkCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkReportUnitEngineer",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkReportUnitId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkReportUnitEngineer", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkReportUnitEngineer_WorkReportUnit_WorkReportUnitId",
                        column: x => x.WorkReportUnitId,
                        principalSchema: "dbo",
                        principalTable: "WorkReportUnit",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkWeekDeadlineOverride",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkWeekId = table.Column<int>(type: "int", nullable: false),
                    WorkshopId = table.Column<int>(type: "int", nullable: false),
                    PlanDeadlineAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReportDeadlineAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkWeekDeadlineOverride", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkWeekDeadlineOverride_WorkWeek_WorkWeekId",
                        column: x => x.WorkWeekId,
                        principalSchema: "dbo",
                        principalTable: "WorkWeek",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaterialPurpose_Code",
                schema: "dbo",
                table: "MaterialPurpose",
                column: "Code",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_WorkCategory_Code",
                schema: "dbo",
                table: "WorkCategory",
                column: "Code",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_WorkCategory_CodeSuffix",
                schema: "dbo",
                table: "WorkCategory",
                column: "CodeSuffix",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportUnit_OrgUnitId",
                schema: "dbo",
                table: "WorkReportUnit",
                column: "OrgUnitId",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportUnitEngineer_EmployeeId",
                schema: "dbo",
                table: "WorkReportUnitEngineer",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportUnitEngineer_WorkReportUnitId_EmployeeId",
                schema: "dbo",
                table: "WorkReportUnitEngineer",
                columns: new[] { "WorkReportUnitId", "EmployeeId" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkWeek_IsoYear_IsoWeek",
                schema: "dbo",
                table: "WorkWeek",
                columns: new[] { "IsoYear", "IsoWeek" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_WorkWeek_StartDate",
                schema: "dbo",
                table: "WorkWeek",
                column: "StartDate");

            migrationBuilder.CreateIndex(
                name: "IX_WorkWeekDeadlineOverride_WorkWeekId_WorkshopId",
                schema: "dbo",
                table: "WorkWeekDeadlineOverride",
                columns: new[] { "WorkWeekId", "WorkshopId" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaterialPurpose",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkCategoryWorkshop",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkReportSetting",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkReportUnitEngineer",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkWeekDeadlineOverride",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkCategory",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkReportUnit",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "WorkWeek",
                schema: "dbo");
        }
    }
}
