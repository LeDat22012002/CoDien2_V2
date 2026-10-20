using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Identity.Entities;

namespace Server.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshToken", "dbo");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TokenHash).HasMaxLength(128).IsUnicode(false).IsRequired();
        builder.Property(x => x.ReplacedByTokenHash).HasMaxLength(128).IsUnicode(false);
        builder.Property(x => x.CreatedByIp).HasMaxLength(45).IsUnicode(false);

        builder.HasIndex(x => x.TokenHash).IsUnique();

        // Ẩn token của user đã xóa mềm, khớp với query filter của User
        builder.HasQueryFilter(x => !x.User.IsDeleted);

        builder.HasOne(x => x.User)
            .WithMany(x => x.RefreshTokens)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
