using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkItemWholeGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WholeGroups",
                schema: "dbo",
                table: "WorkReportItem",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WholeGroups",
                schema: "dbo",
                table: "WorkPlanItem",
                type: "nvarchar(max)",
                nullable: true);

            // Dòng cũ: "Cả tổ" (nếu có) là cả đơn vị
            migrationBuilder.Sql("UPDATE [dbo].[WorkPlanItem] SET [WholeGroups] = N'[]' WHERE [WholeGroups] IS NULL;");
            migrationBuilder.Sql("UPDATE [dbo].[WorkReportItem] SET [WholeGroups] = N'[]' WHERE [WholeGroups] IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WholeGroups",
                schema: "dbo",
                table: "WorkReportItem");

            migrationBuilder.DropColumn(
                name: "WholeGroups",
                schema: "dbo",
                table: "WorkPlanItem");
        }
    }
}
