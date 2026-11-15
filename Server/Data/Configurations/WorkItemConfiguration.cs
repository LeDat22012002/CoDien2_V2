using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkItemConfiguration : IEntityTypeConfiguration<WorkItem>
{
    public void Configure(EntityTypeBuilder<WorkItem> builder)
    {
        builder.ToTable("WorkItem", "dbo");

        builder.HasKey(x => x.Id);

        builder.HasQueryFilter(x => !x.IsDeleted && !x.WeeklyForm.IsDeleted);

        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.EquipmentCode).HasMaxLength(50);
        builder.Property(x => x.EquipmentName).HasMaxLength(255);
        builder.Property(x => x.Description).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.PlannedMinutes).HasPrecision(10, 2);
        builder.Property(x => x.ActualMinutes).HasPrecision(10, 2);
        builder.Property(x => x.ResultPercent).HasPrecision(5, 2);
        builder.Property(x => x.WorkPermit).HasMaxLength(20);
        builder.Property(x => x.FiveS).HasMaxLength(255);
        builder.Property(x => x.Explanation).HasMaxLength(1000);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.RowVersion).IsRowVersion();

        builder.HasIndex(x => x.WeeklyFormId);
        builder.HasIndex(x => x.Code);

        builder.HasOne(x => x.WeeklyForm)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.WeeklyFormId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.WorkCategory)
            .WithMany()
            .HasForeignKey(x => x.WorkCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
