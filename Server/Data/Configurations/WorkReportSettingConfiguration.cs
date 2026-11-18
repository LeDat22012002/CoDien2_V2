using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkReportSettingConfiguration : IEntityTypeConfiguration<WorkReportSetting>
{
    public void Configure(EntityTypeBuilder<WorkReportSetting> builder)
    {
        builder.ToTable("WorkReportSetting", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.HcMinutesPerWeek).HasPrecision(18, 2);
        builder.Property(x => x.ShiftMinutesPerWeek).HasPrecision(18, 2);

        // Xưởng hiện trên trang công khai: mảng JSON Id đơn vị cấp 1, vd [6,35]
        builder.Property(x => x.PublicWorkshopIds).IsUnicode(false).IsRequired();
    }
}