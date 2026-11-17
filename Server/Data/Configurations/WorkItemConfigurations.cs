using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

/// <summary>Cấu hình chung của dòng kế hoạch / báo cáo và người thực hiện (mỗi loại 1 bảng).</summary>
internal static class WorkItemConfigurationHelper
{
    public static void ConfigureItem<TItem, TWorker>(EntityTypeBuilder<TItem> builder, string table)
        where TItem : WorkItemBase<TWorker>
        where TWorker : WorkItemWorkerBase
    {
        builder.ToTable(table, "dbo");

        builder.HasKey(x => x.Id);

        builder.HasQueryFilter(x => !x.IsDeleted && !x.WeeklyForm.IsDeleted);

        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.EquipmentCode).HasMaxLength(50);
        builder.Property(x => x.EquipmentName).HasMaxLength(255);
        builder.Property(x => x.Description).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.RowVersion).IsRowVersion();

        // KTV phụ trách dòng: cột JSON nvarchar(max) [{"EmployeeId":1,"FullName":"…"}]
        builder.OwnsMany(x => x.Engineers, engineer =>
        {
            engineer.ToJson();
            engineer.Property(x => x.FullName).HasMaxLength(255);
        });

        builder.HasIndex(x => x.WeeklyFormId);
        builder.HasIndex(x => x.Code);

        builder.HasOne(x => x.WorkCategory)
            .WithMany()
            .HasForeignKey(x => x.WorkCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    public static void ConfigureWorker<TWorker>(EntityTypeBuilder<TWorker> builder, string table)
        where TWorker : WorkItemWorkerBase
    {
        builder.ToTable(table, "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();

        builder.HasIndex(x => x.EmployeeId);
    }

    public static void ConfigureMaterial<TMaterial>(EntityTypeBuilder<TMaterial> builder, string table)
        where TMaterial : WorkMaterialBase
    {
        builder.ToTable(table, "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.MaterialCode).HasMaxLength(50);
        builder.Property(x => x.MaterialName).HasMaxLength(255).IsRequired();
        builder.Property(x => x.Uom).HasMaxLength(20);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.RowVersion).IsRowVersion();

        builder.HasIndex(x => x.WeeklyFormId);

        builder.HasOne(x => x.MaterialPurpose)
            .WithMany()
            .HasForeignKey(x => x.MaterialPurposeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class WorkPlanItemConfiguration : IEntityTypeConfiguration<WorkPlanItem>
{
    public void Configure(EntityTypeBuilder<WorkPlanItem> builder)
    {
        WorkItemConfigurationHelper.ConfigureItem<WorkPlanItem, WorkPlanItemWorker>(builder, "WorkPlanItem");

        builder.Property(x => x.PlannedMinutes).HasPrecision(10, 2);

        builder.HasOne(x => x.WeeklyForm)
            .WithMany(x => x.PlanItems)
            .HasForeignKey(x => x.WeeklyFormId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class WorkReportItemConfiguration : IEntityTypeConfiguration<WorkReportItem>
{
    public void Configure(EntityTypeBuilder<WorkReportItem> builder)
    {
        WorkItemConfigurationHelper.ConfigureItem<WorkReportItem, WorkReportItemWorker>(builder, "WorkReportItem");

        builder.Property(x => x.PlannedMinutes).HasPrecision(10, 2);
        builder.Property(x => x.ActualMinutes).HasPrecision(10, 2);
        builder.Property(x => x.ResultPercent).HasPrecision(5, 2);
        builder.Property(x => x.WorkPermit).HasMaxLength(20);
        builder.Property(x => x.FiveS).HasMaxLength(255);
        builder.Property(x => x.Explanation).HasMaxLength(1000);

        // Không khai báo FK tới WorkPlanItem: dòng kế hoạch xóa (mềm) thì dòng báo cáo vẫn giữ, chỉ để đối chiếu gợi ý.
        // Unique: 1 dòng kế hoạch chỉ đưa vào báo cáo 1 lần (dòng báo cáo đã xóa thì đưa lại được)
        builder.HasIndex(x => x.PlanItemId)
            .IsUnique()
            .HasFilter("[IsDeleted] = 0 AND [PlanItemId] IS NOT NULL");

        builder.HasOne(x => x.WeeklyForm)
            .WithMany(x => x.ReportItems)
            .HasForeignKey(x => x.WeeklyFormId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class WorkPlanItemWorkerConfiguration : IEntityTypeConfiguration<WorkPlanItemWorker>
{
    public void Configure(EntityTypeBuilder<WorkPlanItemWorker> builder)
    {
        WorkItemConfigurationHelper.ConfigureWorker(builder, "WorkPlanItemWorker");

        // Khớp query filter (xóa mềm) của dòng
        builder.HasQueryFilter(x => !x.WorkPlanItem.IsDeleted);
        builder.HasIndex(x => x.WorkPlanItemId);

        builder.HasOne(x => x.WorkPlanItem)
            .WithMany(x => x.Workers)
            .HasForeignKey(x => x.WorkPlanItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class WorkReportItemWorkerConfiguration : IEntityTypeConfiguration<WorkReportItemWorker>
{
    public void Configure(EntityTypeBuilder<WorkReportItemWorker> builder)
    {
        WorkItemConfigurationHelper.ConfigureWorker(builder, "WorkReportItemWorker");

        builder.HasQueryFilter(x => !x.WorkReportItem.IsDeleted);
        builder.HasIndex(x => x.WorkReportItemId);

        builder.HasOne(x => x.WorkReportItem)
            .WithMany(x => x.Workers)
            .HasForeignKey(x => x.WorkReportItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class WorkPlanMaterialConfiguration : IEntityTypeConfiguration<WorkPlanMaterial>
{
    public void Configure(EntityTypeBuilder<WorkPlanMaterial> builder)
    {
        WorkItemConfigurationHelper.ConfigureMaterial(builder, "WorkPlanMaterial");

        builder.HasQueryFilter(x => !x.IsDeleted && !x.WorkPlanItem.IsDeleted);
        builder.Property(x => x.Quantity).HasPrecision(18, 3);
        builder.HasIndex(x => x.WorkPlanItemId);

        builder.HasOne(x => x.WorkPlanItem)
            .WithMany()
            .HasForeignKey(x => x.WorkPlanItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class WorkReportMaterialConfiguration : IEntityTypeConfiguration<WorkReportMaterial>
{
    public void Configure(EntityTypeBuilder<WorkReportMaterial> builder)
    {
        WorkItemConfigurationHelper.ConfigureMaterial(builder, "WorkReportMaterial");

        builder.HasQueryFilter(x => !x.IsDeleted && !x.WorkReportItem.IsDeleted);
        builder.Property(x => x.PlannedQuantity).HasPrecision(18, 3);
        builder.Property(x => x.ActualQuantity).HasPrecision(18, 3);
        builder.HasIndex(x => x.WorkReportItemId);

        builder.HasOne(x => x.WorkReportItem)
            .WithMany()
            .HasForeignKey(x => x.WorkReportItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
