using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkItemCodeCounterConfiguration : IEntityTypeConfiguration<WorkItemCodeCounter>
{
    public void Configure(EntityTypeBuilder<WorkItemCodeCounter> builder)
    {
        // Không khai báo FK để tránh cảnh báo query filter (WeeklyForm/WorkCategory xóa mềm); chỉ đọc qua UPDLOCK
        builder.ToTable("WorkItemCodeCounter", "dbo");

        builder.HasKey(x => new { x.WeeklyFormId, x.WorkCategoryId });
    }
}
