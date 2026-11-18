using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkReportUnitConfiguration : IEntityTypeConfiguration<WorkReportUnit>
{
    public void Configure(EntityTypeBuilder<WorkReportUnit> builder)
    {
        builder.ToTable("WorkReportUnit", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.DisplayName).HasMaxLength(255).IsRequired();
        builder.Property(x => x.CodePrefix).HasMaxLength(20).IsRequired();
        builder.Property(x => x.LaborType).HasMaxLength(10).IsUnicode(false).IsRequired();

        // Tổ gộp của đơn vị tự đặt: mảng JSON Id tổ trên sơ đồ, vd [41,42]
        builder.Property(x => x.MemberOrgUnitIds).IsUnicode(false).IsRequired();

        // Mỗi tổ/kíp tối đa 1 đơn vị báo cáo theo sơ đồ (đơn vị tự đặt cùng đội/xưởng thì nhiều).
        // Tiền tố duy nhất trong xưởng: kiểm tra ở Service (xưởng tính từ cây tổ chức)
        builder.HasIndex(x => x.OrgUnitId).IsUnique().HasFilter("[IsDeleted] = 0 AND [IsCustom] = 0");
    }
}