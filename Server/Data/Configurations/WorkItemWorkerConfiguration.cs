using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkItemWorkerConfiguration : IEntityTypeConfiguration<WorkItemWorker>
{
    public void Configure(EntityTypeBuilder<WorkItemWorker> builder)
    {
        builder.ToTable("WorkItemWorker", "dbo");

        builder.HasKey(x => x.Id);

        // Khớp query filter (xóa mềm) của WorkItem
        builder.HasQueryFilter(x => !x.WorkItem.IsDeleted);

        builder.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();

        builder.HasIndex(x => x.WorkItemId);
        builder.HasIndex(x => x.EmployeeId);

        builder.HasOne(x => x.WorkItem)
            .WithMany(x => x.Workers)
            .HasForeignKey(x => x.WorkItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
