using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class MaterialPurposeConfiguration : IEntityTypeConfiguration<MaterialPurpose>
{
    public void Configure(EntityTypeBuilder<MaterialPurpose> builder)
    {
        builder.ToTable("MaterialPurpose", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(255);

        builder.HasIndex(x => x.Code).IsUnique().HasFilter("[IsDeleted] = 0");
    }
}