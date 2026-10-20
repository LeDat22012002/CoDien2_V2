using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class OrgUnitConfiguration : IEntityTypeConfiguration<OrgUnit>
{
    public void Configure(EntityTypeBuilder<OrgUnit> builder)
    {
        // Bảng có sẵn trong DB, không do EF tạo
        builder.ToTable("OrgUnit", "dbo", table => table.ExcludeFromMigrations());

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(255).IsRequired();
        builder.Property(x => x.ShortName).HasMaxLength(100);
        builder.Property(x => x.TypeCode).HasMaxLength(20).IsUnicode(false).IsRequired();
        builder.Property(x => x.HeadLevelCode).HasMaxLength(10).IsUnicode(false);
        builder.Property(x => x.DisciplineCode).HasMaxLength(10).IsUnicode(false);
        builder.Property(x => x.Area).HasMaxLength(255);
        builder.Property(x => x.Shift).HasMaxLength(5).IsUnicode(false);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2");

        builder.HasOne(x => x.Type)
            .WithMany()
            .HasForeignKey(x => x.TypeCode)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Parent)
            .WithMany(x => x.Children)
            .HasForeignKey(x => x.ParentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
