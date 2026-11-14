using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkReportUnitEngineerConfiguration : IEntityTypeConfiguration<WorkReportUnitEngineer>
{
    public void Configure(EntityTypeBuilder<WorkReportUnitEngineer> builder)
    {
        builder.ToTable("WorkReportUnitEngineer", "dbo");

        builder.HasKey(x => x.Id);

        // Xóa mềm của chính bảng + ẩn theo đơn vị báo cáo đã xóa mềm
        builder.HasQueryFilter(x => !x.IsDeleted && !x.WorkReportUnit.IsDeleted);

        builder.HasIndex(x => new { x.WorkReportUnitId, x.EmployeeId });
        builder.HasIndex(x => x.EmployeeId);

        builder.HasOne(x => x.WorkReportUnit)
            .WithMany(x => x.Engineers)
            .HasForeignKey(x => x.WorkReportUnitId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}