using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkWeekConfiguration : IEntityTypeConfiguration<WorkWeek>
{
    public void Configure(EntityTypeBuilder<WorkWeek> builder)
    {
        builder.ToTable("WorkWeek", "dbo");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.IsoYear, x.IsoWeek }).IsUnique().HasFilter("[IsDeleted] = 0");
        builder.HasIndex(x => x.StartDate);
    }
}