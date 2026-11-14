using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkWeekDeadlineOverrideConfiguration : IEntityTypeConfiguration<WorkWeekDeadlineOverride>
{
    public void Configure(EntityTypeBuilder<WorkWeekDeadlineOverride> builder)
    {
        builder.ToTable("WorkWeekDeadlineOverride", "dbo");

        builder.HasKey(x => x.Id);

        builder.HasQueryFilter(x => !x.IsDeleted && !x.WorkWeek.IsDeleted);

        builder.HasIndex(x => new { x.WorkWeekId, x.WorkshopId }).IsUnique().HasFilter("[IsDeleted] = 0");

        builder.HasOne(x => x.WorkWeek)
            .WithMany(x => x.DeadlineOverrides)
            .HasForeignKey(x => x.WorkWeekId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}