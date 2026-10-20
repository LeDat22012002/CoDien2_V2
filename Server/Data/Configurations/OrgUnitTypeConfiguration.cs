using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class OrgUnitTypeConfiguration : IEntityTypeConfiguration<OrgUnitType>
{
    public void Configure(EntityTypeBuilder<OrgUnitType> builder)
    {
        builder.ToTable("OrgUnitType", "dbo", table => table.ExcludeFromMigrations());

        builder.HasKey(x => x.Code);

        builder.Property(x => x.Code).HasMaxLength(20).IsUnicode(false);
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.HeadLevelCode).HasMaxLength(10).IsUnicode(false).IsRequired();
        builder.Property(x => x.DeputyLevelCode).HasMaxLength(10).IsUnicode(false);
    }
}
