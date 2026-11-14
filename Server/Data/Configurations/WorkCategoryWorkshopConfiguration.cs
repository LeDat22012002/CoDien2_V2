using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Configurations;

public class WorkCategoryWorkshopConfiguration : IEntityTypeConfiguration<WorkCategoryWorkshop>
{
    public void Configure(EntityTypeBuilder<WorkCategoryWorkshop> builder)
    {
        builder.ToTable("WorkCategoryWorkshop", "dbo");

        builder.HasKey(x => new { x.WorkCategoryId, x.WorkshopId });

        // Khớp query filter (xóa mềm) của WorkCategory
        builder.HasQueryFilter(x => !x.WorkCategory.IsDeleted);

        builder.HasOne(x => x.WorkCategory)
            .WithMany(x => x.Workshops)
            .HasForeignKey(x => x.WorkCategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}