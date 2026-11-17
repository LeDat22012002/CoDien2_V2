using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Materials.Entities;

namespace Server.Data.Configurations;

public class MaterialConfiguration : IEntityTypeConfiguration<Material>
{
    public void Configure(EntityTypeBuilder<Material> builder)
    {
        // Bảng có sẵn trong DB (chép từ TEST.dbo.Materials), không do EF tạo: loại khỏi migration.
        // Index IX_Material_Material trên cột Material đã tạo bằng SQL. Cột BOM là đơn vị tính → property Uom.
        builder.ToTable("Material", "dbo", table => table.ExcludeFromMigrations());

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code).HasColumnName("Material").HasMaxLength(200);
        builder.Property(x => x.Description).HasColumnName("MaterialDescription").HasMaxLength(500);
        builder.Property(x => x.BasicDataText).HasMaxLength(500);
        builder.Property(x => x.Plant).HasMaxLength(100);
        builder.Property(x => x.MaterialGroup).HasMaxLength(200);
        builder.Property(x => x.Class).HasMaxLength(200);
        builder.Property(x => x.Level);
        builder.Property(x => x.MaterialLevel).HasMaxLength(100);
        builder.Property(x => x.DocumentNo).HasColumnName("SoTaiLieu").HasMaxLength(200);
        builder.Property(x => x.TypeOfSupplies).HasMaxLength(50);
        builder.Property(x => x.Uom).HasColumnName("BOM").HasMaxLength(200);

        builder.HasIndex(x => x.Code).HasDatabaseName("IX_Material_Material");
    }
}