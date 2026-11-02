using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class OrgChartHiddenEmployeeConfiguration : IEntityTypeConfiguration<OrgChartHiddenEmployee>
{
    public void Configure(EntityTypeBuilder<OrgChartHiddenEmployee> builder)
    {
        builder.ToTable("OrgChartHiddenEmployee", "dbo");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.EmployeeId).IsUnique().HasFilter("[IsDeleted] = 0");

        builder.HasOne(x => x.Employee)
            .WithMany()
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
