using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Identity.Entities;

namespace Server.Data.Configurations;

public class UserRoleConfiguration : IEntityTypeConfiguration<UserRole>
{
    public void Configure(EntityTypeBuilder<UserRole> builder)
    {
        builder.ToTable("UserRole", "dbo");

        builder.HasKey(x => new { x.UserId, x.RoleId });

        builder.Property(x => x.AssignedBy).HasMaxLength(50);

        // Ẩn liên kết tới user/role đã xóa mềm, khớp với query filter của User và Role
        builder.HasQueryFilter(x => !x.User.IsDeleted && !x.Role.IsDeleted);

        builder.HasOne(x => x.User)
            .WithMany(x => x.UserRoles)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Role)
            .WithMany(x => x.UserRoles)
            .HasForeignKey(x => x.RoleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
