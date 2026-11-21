using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class SplitWorkItemCodeCounterByPhase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_WorkItemCodeCounter",
                schema: "dbo",
                table: "WorkItemCodeCounter");

            migrationBuilder.AddColumn<string>(
                name: "Phase",
                schema: "dbo",
                table: "WorkItemCodeCounter",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "PLAN");

            migrationBuilder.AddPrimaryKey(
                name: "PK_WorkItemCodeCounter",
                schema: "dbo",
                table: "WorkItemCodeCounter",
                columns: new[] { "WeeklyFormId", "Phase", "WorkCategoryId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_WorkItemCodeCounter",
                schema: "dbo",
                table: "WorkItemCodeCounter");

            migrationBuilder.DropColumn(
                name: "Phase",
                schema: "dbo",
                table: "WorkItemCodeCounter");

            migrationBuilder.AddPrimaryKey(
                name: "PK_WorkItemCodeCounter",
                schema: "dbo",
                table: "WorkItemCodeCounter",
                columns: new[] { "WeeklyFormId", "WorkCategoryId" });
        }
    }
}
