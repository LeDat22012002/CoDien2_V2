using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPageAreaAndExternalUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Area",
                schema: "dbo",
                table: "Page",
                type: "varchar(20)",
                unicode: false,
                maxLength: 20,
                nullable: false,
                defaultValue: "ADMIN");

            migrationBuilder.AddColumn<string>(
                name: "ExternalUrl",
                schema: "dbo",
                table: "Page",
                type: "varchar(1000)",
                unicode: false,
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Area",
                schema: "dbo",
                table: "Page");

            migrationBuilder.DropColumn(
                name: "ExternalUrl",
                schema: "dbo",
                table: "Page");
        }
    }
}
