
namespace Server.Data;

public class UnitOfWork(AppDbContext dbContext) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken cancellationToken)
    {
        await ExecuteInTransactionAsync(async ct =>
        {
            await action(ct);
            return true;
        }, cancellationToken);
    }

    public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken cancellationToken)
    {
        // Gọi lồng trong transaction đang mở (vd tạo nhân viên kèm vị trí ban đầu): dùng chung transaction ngoài,
        // chỉ lưu thay đổi; transaction ngoài commit / rollback.
        if (dbContext.Database.CurrentTransaction is not null)
        {
            var nestedResult = await action(cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
            return nestedResult;
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var result = await action(cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return result;
    }
}
