using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WeeklyFormConfiguration : IEntityTypeConfiguration<WeeklyForm>
{
    public void Configure(EntityTypeBuilder<WeeklyForm> builder)
    {
        builder.ToTable("WeeklyForm", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.UnitName).HasMaxLength(255).IsRequired();
        builder.Property(x => x.CodePrefix).HasMaxLength(20).IsRequired();
        builder.Property(x => x.LaborType).HasMaxLength(10).IsUnicode(false).IsRequired();
        builder.Property(x => x.CapacityMinutes).HasPrecision(18, 2);
        builder.Property(x => x.EngineerNames).HasMaxLength(500);

        // Mỗi đơn vị 1 form / tuần
        builder.HasIndex(x => new { x.WorkReportUnitId, x.WorkWeekId }).IsUnique().HasFilter("[IsDeleted] = 0");
        builder.HasIndex(x => new { x.WorkWeekId, x.WorkshopId });

        builder.HasOne(x => x.WorkReportUnit)
            .WithMany()
            .HasForeignKey(x => x.WorkReportUnitId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.WorkWeek)
            .WithMany()
            .HasForeignKey(x => x.WorkWeekId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
