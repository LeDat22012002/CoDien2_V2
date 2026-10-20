using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Identity.Entities;

namespace Server.Data.Configurations;

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("Permission", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).HasMaxLength(100).IsUnicode(false).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Module).HasMaxLength(50).IsUnicode(false).IsRequired();

        builder.HasIndex(x => x.Code).IsUnique();
    }
}
