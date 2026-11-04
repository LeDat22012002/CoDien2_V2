using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.AuditLogs.Entities;

namespace Server.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLog", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Type).HasMaxLength(20).IsUnicode(false).IsRequired();
        builder.Property(x => x.EmpCode).HasMaxLength(50);
        builder.Property(x => x.FullName).HasMaxLength(100);
        builder.Property(x => x.Method).HasMaxLength(10).IsUnicode(false);
        builder.Property(x => x.Path).HasMaxLength(AuditLogLimits.PathMaxLength).IsRequired();
        builder.Property(x => x.PageTitle).HasMaxLength(AuditLogLimits.PageTitleMaxLength);
        builder.Property(x => x.Endpoint).HasMaxLength(200).IsUnicode(false);
        builder.Property(x => x.Message).HasMaxLength(AuditLogLimits.MessageMaxLength);
        builder.Property(x => x.RequestBody).HasMaxLength(AuditLogLimits.RequestBodyMaxLength);
        builder.Property(x => x.IpAddress).HasMaxLength(50).IsUnicode(false);
        builder.Property(x => x.UserAgent).HasMaxLength(AuditLogLimits.UserAgentMaxLength);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2");

        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => new { x.EmpCode, x.CreatedAt });
        builder.HasIndex(x => new { x.Type, x.CreatedAt });
    }
}
