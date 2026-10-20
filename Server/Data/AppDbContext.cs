using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using Server.Shared.Entities;
using Server.Shared.Services;

namespace Server.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUserService)
    : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Nạp mọi IEntityTypeConfiguration trong Data/Configurations
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Cấu hình chung cho mọi entity gốc kế thừa BaseEntity
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(BaseEntity).IsAssignableFrom(entityType.ClrType) || entityType.BaseType is not null)
            {
                continue;
            }

            var entity = modelBuilder.Entity(entityType.ClrType);
            entity.Property(nameof(BaseEntity.CreatedBy)).HasMaxLength(50);
            entity.Property(nameof(BaseEntity.UpdatedBy)).HasMaxLength(50);

            // Xóa mềm: tự lọc bản ghi IsDeleted
            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var isDeleted = Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
            entity.HasQueryFilter(Expression.Lambda(Expression.Not(isDeleted), parameter));
        }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<decimal>().HavePrecision(18, 4);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditInfo();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditInfo()
    {
        var now = DateTime.UtcNow;
        var userName = currentUserService.UserName;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.CreatedBy = userName;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = userName;
                    break;
                case EntityState.Deleted:
                    // Chuyển xóa cứng thành xóa mềm
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = userName;
                    break;
            }
        }
    }
}
