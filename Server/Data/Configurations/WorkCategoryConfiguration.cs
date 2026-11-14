using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkCategoryConfiguration : IEntityTypeConfiguration<WorkCategory>
{
    public void Configure(EntityTypeBuilder<WorkCategory> builder)
    {
        builder.ToTable("WorkCategory", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.Property(x => x.GroupLetter).HasMaxLength(5).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.CodeSuffix).HasMaxLength(10).IsRequired();

        builder.HasIndex(x => x.Code).IsUnique().HasFilter("[IsDeleted] = 0");
        builder.HasIndex(x => x.CodeSuffix).IsUnique().HasFilter("[IsDeleted] = 0");
    }
}