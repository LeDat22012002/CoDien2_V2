using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class EmployeeAssignmentConfiguration : IEntityTypeConfiguration<EmployeeAssignment>
{
    public void Configure(EntityTypeBuilder<EmployeeAssignment> builder)
    {
        builder.ToTable("EmployeeAssignment", "dbo", table => table.ExcludeFromMigrations());

        builder.HasKey(x => x.Id);

        builder.Property(x => x.LevelCode).HasMaxLength(10).IsUnicode(false).IsRequired();
        builder.Property(x => x.JobTitle).HasMaxLength(255);
        builder.Property(x => x.StartDate).HasColumnType("date");
        builder.Property(x => x.EndDate).HasColumnType("date");
        builder.Property(x => x.ChangeType).HasMaxLength(20).IsUnicode(false).IsRequired();
        builder.Property(x => x.DecisionNo).HasMaxLength(100);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2");

        builder.HasOne(x => x.Employee)
            .WithMany()
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.OrgUnit)
            .WithMany()
            .HasForeignKey(x => x.OrgUnitId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Level)
            .WithMany()
            .HasForeignKey(x => x.LevelCode)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
