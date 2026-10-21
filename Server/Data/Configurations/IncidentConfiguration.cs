using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Incidents.Entities;

namespace Server.Data.Configurations;

public class IncidentConfiguration : IEntityTypeConfiguration<Incident>
{
    private const int LongTextMaxLength = 4000;

    public void Configure(EntityTypeBuilder<Incident> builder)
    {
        builder.ToTable("Incident", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Shift).HasMaxLength(20).IsRequired();
        builder.Property(x => x.EquipmentCode).HasMaxLength(50).IsRequired();
        builder.Property(x => x.EquipmentName).HasMaxLength(255).IsRequired();
        builder.Property(x => x.DeviceName).HasMaxLength(255);
        builder.Property(x => x.ReceivedAt).HasColumnType("datetime2");
        builder.Property(x => x.RepairStartedAt).HasColumnType("datetime2");
        builder.Property(x => x.RepairFinishedAt).HasColumnType("datetime2");
        builder.Property(x => x.HandedOverAt).HasColumnType("datetime2");
        builder.Property(x => x.IncidentType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.StopLevel).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(LongTextMaxLength);
        builder.Property(x => x.Solution).HasMaxLength(LongTextMaxLength);
        builder.Property(x => x.Note).HasMaxLength(LongTextMaxLength);
        builder.Property(x => x.Cause).HasMaxLength(LongTextMaxLength);
        builder.Property(x => x.RootCause).HasMaxLength(LongTextMaxLength);
        builder.Property(x => x.CorrectiveAction).HasMaxLength(LongTextMaxLength);
        builder.Property(x => x.ReportedAt).HasColumnType("datetime2");
        builder.Property(x => x.ReporterEmpCode).HasMaxLength(50);
        builder.Property(x => x.ReporterName).HasMaxLength(100);
        builder.Property(x => x.OrderNumber).HasMaxLength(100);
        builder.Property(x => x.ReportLink).HasMaxLength(500);

        builder.HasIndex(x => x.ReportedAt);
        builder.HasIndex(x => x.ReceivedAt);
        builder.HasIndex(x => x.WorkshopId);
        builder.HasIndex(x => x.EquipmentCode);
        builder.HasIndex(x => x.ReporterEmpCode);
    }
}
