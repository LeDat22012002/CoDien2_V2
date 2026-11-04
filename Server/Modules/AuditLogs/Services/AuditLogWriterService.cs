using Server.Data;
using Server.Modules.AuditLogs.Entities;
using Server.Modules.AuditLogs.Repositories.Interfaces;
using Server.Modules.AuditLogs.Services.Interfaces;

namespace Server.Modules.AuditLogs.Services;

/// <summary>
/// Ghi log từ hàng đợi xuống DB theo lô, bằng DbContext riêng (scope mới) để không lẫn với thay đổi
/// đang dở của request (vd request lỗi giữa chừng). Lỗi ghi chỉ ghi log hệ thống, không dừng service.
/// </summary>
public class AuditLogWriterService(
    IAuditLogQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<AuditLogWriterService> logger) : BackgroundService
{
    private const int BatchSize = 200;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var batch = new List<AuditLog>(BatchSize);

        try
        {
            while (await queue.Reader.WaitToReadAsync(stoppingToken))
            {
                while (batch.Count < BatchSize && queue.Reader.TryRead(out var log))
                {
                    batch.Add(log);
                }

                await WriteAsync(batch, stoppingToken);
                batch.Clear();
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Server đang tắt: ghi nốt phần còn trong hàng đợi
            while (queue.Reader.TryRead(out var log))
            {
                batch.Add(log);
            }

            await WriteAsync(batch, CancellationToken.None);
        }
    }

    private async Task WriteAsync(List<AuditLog> batch, CancellationToken cancellationToken)
    {
        if (batch.Count == 0)
        {
            return;
        }

        try
        {
            using var scope = scopeFactory.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IAuditLogRepository>();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

            repository.AddRange(batch);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Không ghi được {Count} dòng nhật ký", batch.Count);
        }
    }
}
