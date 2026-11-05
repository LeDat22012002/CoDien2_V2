using Server.Modules.AuditLogs.Repositories.Interfaces;

namespace Server.Modules.AuditLogs.Services;

/// <summary>
/// Mỗi ngày xóa cứng log cũ hơn AuditLog:RetentionDays (mặc định 30 ngày).
/// Chạy lần đầu sau khi Server khởi động 1 phút, sau đó cứ 24 giờ một lần.
/// </summary>
public class AuditLogCleanupService(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<AuditLogCleanupService> logger) : BackgroundService
{
    private const int DefaultRetentionDays = 30;
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var retentionDays = Math.Max(1, configuration.GetValue("AuditLog:RetentionDays", DefaultRetentionDays));

        try
        {
            await Task.Delay(StartupDelay, stoppingToken);

            using var timer = new PeriodicTimer(Interval);
            do
            {
                await DeleteExpiredAsync(retentionDays, stoppingToken);
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Server đang tắt
        }
    }

    private async Task DeleteExpiredAsync(int retentionDays, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IAuditLogRepository>();

            var threshold = DateTime.Now.Date.AddDays(-retentionDays);
            var deletedCount = await repository.DeleteOlderThanAsync(threshold, cancellationToken);
            if (deletedCount > 0)
            {
                logger.LogInformation("Đã xóa {Count} dòng nhật ký trước {Threshold:dd/MM/yyyy}", deletedCount, threshold);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Không xóa được nhật ký cũ");
        }
    }
}
