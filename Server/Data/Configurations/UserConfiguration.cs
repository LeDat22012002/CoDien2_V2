using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Identity.Entities;

namespace Server.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        // "User" là từ khóa SQL Server: viết SQL tay phải dùng [dbo].[User]
        builder.ToTable("User", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
        builder.Property(x => x.SecurityStamp).HasMaxLength(50).IsUnicode(false).IsRequired();

        // 1 nhân viên chỉ có 1 tài khoản còn hiệu lực (bỏ qua tài khoản đã xóa mềm)
        builder.HasIndex(x => x.EmployeeId).IsUnique().HasFilter("[IsDeleted] = 0");

        builder.HasOne(x => x.Employee)
            .WithMany()
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
