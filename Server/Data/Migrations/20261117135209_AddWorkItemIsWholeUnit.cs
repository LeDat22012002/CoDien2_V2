using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkItemIsWholeUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsWholeUnit",
                schema: "dbo",
                table: "WorkReportItem",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsWholeUnit",
                schema: "dbo",
                table: "WorkPlanItem",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsWholeUnit",
                schema: "dbo",
                table: "WorkReportItem");

            migrationBuilder.DropColumn(
                name: "IsWholeUnit",
                schema: "dbo",
                table: "WorkPlanItem");
        }
    }
}
