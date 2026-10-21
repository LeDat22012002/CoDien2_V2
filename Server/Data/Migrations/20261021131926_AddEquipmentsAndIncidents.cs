using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentsAndIncidents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Equipment",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipment", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Incident",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkshopId = table.Column<int>(type: "int", nullable: true),
                    Shift = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EquipmentCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EquipmentName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    DeviceName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RepairStartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RepairFinishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HandedOverAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IncidentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StopLevel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AffectsProduction = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Solution = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Result = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Cause = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    RootCause = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    CorrectiveAction = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ReportedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReporterEmpCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ReporterName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    OrderNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReportLink = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Incident", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Equipment_Code",
                schema: "dbo",
                table: "Equipment",
                column: "Code",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_EquipmentCode",
                schema: "dbo",
                table: "Incident",
                column: "EquipmentCode");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_ReceivedAt",
                schema: "dbo",
                table: "Incident",
                column: "ReceivedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_ReportedAt",
                schema: "dbo",
                table: "Incident",
                column: "ReportedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_ReporterEmpCode",
                schema: "dbo",
                table: "Incident",
                column: "ReporterEmpCode");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_WorkshopId",
                schema: "dbo",
                table: "Incident",
                column: "WorkshopId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Equipment",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "Incident",
                schema: "dbo");
        }
    }
}
