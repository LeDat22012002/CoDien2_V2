using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkItemEngineers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Engineers",
                schema: "dbo",
                table: "WorkReportItem",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Engineers",
                schema: "dbo",
                table: "WorkPlanItem",
                type: "nvarchar(max)",
                nullable: true);

            // Dòng cũ: danh sách KTV rỗng (Client hiện KTV của form như trước)
            migrationBuilder.Sql("UPDATE [dbo].[WorkPlanItem] SET [Engineers] = N'[]' WHERE [Engineers] IS NULL;");
            migrationBuilder.Sql("UPDATE [dbo].[WorkReportItem] SET [Engineers] = N'[]' WHERE [Engineers] IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Engineers",
                schema: "dbo",
                table: "WorkReportItem");

            migrationBuilder.DropColumn(
                name: "Engineers",
                schema: "dbo",
                table: "WorkPlanItem");
        }
    }
}
