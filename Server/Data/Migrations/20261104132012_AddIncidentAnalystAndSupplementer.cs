using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentAnalystAndSupplementer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AnalystEmpCode",
                schema: "dbo",
                table: "Incident",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnalystName",
                schema: "dbo",
                table: "Incident",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AnalyzedAt",
                schema: "dbo",
                table: "Incident",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SupplementedAt",
                schema: "dbo",
                table: "Incident",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplementerEmpCode",
                schema: "dbo",
                table: "Incident",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplementerName",
                schema: "dbo",
                table: "Incident",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnalystEmpCode",
                schema: "dbo",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "AnalystName",
                schema: "dbo",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "AnalyzedAt",
                schema: "dbo",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "SupplementedAt",
                schema: "dbo",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "SupplementerEmpCode",
                schema: "dbo",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "SupplementerName",
                schema: "dbo",
                table: "Incident");
        }
    }
}
