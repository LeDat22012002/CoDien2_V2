using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class VUnitMemberConfiguration : IEntityTypeConfiguration<VUnitMember>
{
    public void Configure(EntityTypeBuilder<VUnitMember> builder)
    {
        // View có sẵn trong DB, chỉ đọc
        builder.ToView("vUnitMember", "dbo");
        builder.HasNoKey();

        builder.Property(x => x.Rank).HasColumnType("smallint");
        builder.Property(x => x.ChartRow).HasColumnType("tinyint");
    }
}
