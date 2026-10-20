using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class PositionLevelConfiguration : IEntityTypeConfiguration<PositionLevel>
{
    public void Configure(EntityTypeBuilder<PositionLevel> builder)
    {
        builder.ToTable("PositionLevel", "dbo", table => table.ExcludeFromMigrations());

        builder.HasKey(x => x.Code);

        builder.Property(x => x.Code).HasMaxLength(10).IsUnicode(false);
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Rank).HasColumnType("smallint");
        builder.Property(x => x.ChartRow).HasColumnType("tinyint");
        builder.Property(x => x.DisplayMode).HasMaxLength(10).IsUnicode(false).IsRequired();
        builder.Property(x => x.BlockLabel).HasMaxLength(50);
    }
}
