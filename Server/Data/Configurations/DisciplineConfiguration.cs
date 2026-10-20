using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class DisciplineConfiguration : IEntityTypeConfiguration<Discipline>
{
    public void Configure(EntityTypeBuilder<Discipline> builder)
    {
        builder.ToTable("Discipline", "dbo", table => table.ExcludeFromMigrations());

        builder.HasKey(x => x.Code);

        builder.Property(x => x.Code).HasMaxLength(10).IsUnicode(false);
        builder.Property(x => x.Name).HasMaxLength(50).IsRequired();
    }
}
