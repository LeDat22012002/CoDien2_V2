using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class OrgUnitTypeParentConfiguration : IEntityTypeConfiguration<OrgUnitTypeParent>
{
    public void Configure(EntityTypeBuilder<OrgUnitTypeParent> builder)
    {
        builder.ToTable("OrgUnitTypeParent", "dbo", table => table.ExcludeFromMigrations());

        builder.HasKey(x => new { x.ChildTypeCode, x.ParentTypeCode });

        builder.Property(x => x.ChildTypeCode).HasMaxLength(20).IsUnicode(false);
        builder.Property(x => x.ParentTypeCode).HasMaxLength(20).IsUnicode(false);
    }
}
