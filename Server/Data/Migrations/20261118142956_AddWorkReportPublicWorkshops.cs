using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkReportPublicWorkshops : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PublicWorkshopIds",
                schema: "dbo",
                table: "WorkReportSetting",
                type: "varchar(max)",
                unicode: false,
                nullable: false,
                defaultValue: "[]");

            // Mặc định trang công khai: 5 xưởng cơ điện (các đơn vị khác tạm ẩn; đổi trong Cài đặt báo cáo tuần)
            migrationBuilder.Sql("""
                UPDATE [dbo].[WorkReportSetting]
                SET [PublicWorkshopIds] = ISNULL((
                    SELECT '[' + STRING_AGG(CAST([Id] AS varchar(20)), ',') WITHIN GROUP (ORDER BY [SortOrder], [Id]) + ']'
                    FROM [dbo].[OrgUnit]
                    WHERE [Code] IN (N'X.CĐLG1', N'X.CĐLG2', N'X.CĐNĐ1', N'X.CĐNĐ2', N'X.CĐNL')), '[]');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PublicWorkshopIds",
                schema: "dbo",
                table: "WorkReportSetting");
        }
    }
}
