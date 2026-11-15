using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkMaterialConfiguration : IEntityTypeConfiguration<WorkMaterial>
{
    public void Configure(EntityTypeBuilder<WorkMaterial> builder)
    {
        builder.ToTable("WorkMaterial", "dbo");

        builder.HasKey(x => x.Id);

        builder.HasQueryFilter(x => !x.IsDeleted && !x.WorkItem.IsDeleted);

        builder.Property(x => x.MaterialCode).HasMaxLength(50);
        builder.Property(x => x.MaterialName).HasMaxLength(255).IsRequired();
        builder.Property(x => x.Uom).HasMaxLength(20);
        builder.Property(x => x.PlannedQuantity).HasPrecision(18, 3);
        builder.Property(x => x.ActualQuantity).HasPrecision(18, 3);
        builder.Property(x => x.Note).HasMaxLength(500);

        builder.HasIndex(x => x.WeeklyFormId);
        builder.HasIndex(x => x.WorkItemId);

        builder.HasOne(x => x.WorkItem)
            .WithMany()
            .HasForeignKey(x => x.WorkItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.MaterialPurpose)
            .WithMany()
            .HasForeignKey(x => x.MaterialPurposeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
