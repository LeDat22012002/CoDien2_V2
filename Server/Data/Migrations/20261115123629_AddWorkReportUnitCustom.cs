using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkReportUnitCustom : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkReportUnit_OrgUnitId",
                schema: "dbo",
                table: "WorkReportUnit");

            migrationBuilder.AddColumn<bool>(
                name: "IsCustom",
                schema: "dbo",
                table: "WorkReportUnit",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportUnit_OrgUnitId",
                schema: "dbo",
                table: "WorkReportUnit",
                column: "OrgUnitId",
                unique: true,
                filter: "[IsDeleted] = 0 AND [IsCustom] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkReportUnit_OrgUnitId",
                schema: "dbo",
                table: "WorkReportUnit");

            migrationBuilder.DropColumn(
                name: "IsCustom",
                schema: "dbo",
                table: "WorkReportUnit");

            migrationBuilder.CreateIndex(
                name: "IX_WorkReportUnit_OrgUnitId",
                schema: "dbo",
                table: "WorkReportUnit",
                column: "OrgUnitId",
                unique: true,
                filter: "[IsDeleted] = 0");
        }
    }
}
