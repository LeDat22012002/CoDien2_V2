using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Domain.Modules.Employees.Entities;

namespace Server.Infrastructure.Modules.Employees.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        // Bảng có sẵn trong DB, không do EF tạo: loại khỏi migration để không bị tạo lại hoặc sửa
        builder.ToTable("Employee", "dbo", table => table.ExcludeFromMigrations());

        builder.HasKey(x => x.Id);

        builder.Property(x => x.EmpCode).HasMaxLength(20).IsUnicode(false).IsRequired();
        builder.Property(x => x.FullName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.BirthDate).HasColumnType("date");
        builder.Property(x => x.EducationLevel).HasMaxLength(10);
        builder.Property(x => x.Major).HasMaxLength(255);
        builder.Property(x => x.Gender).HasMaxLength(10);
        builder.Property(x => x.Email).HasMaxLength(150).IsUnicode(false);
        builder.Property(x => x.Phone).HasMaxLength(20).IsUnicode(false);
        builder.Property(x => x.AvatarUrl).HasMaxLength(500);
        builder.Property(x => x.Status).HasMaxLength(10).IsUnicode(false).IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2");
    }
}
