using Server.Modules.WorkReports.Services.Interfaces;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Tác vụ nền, chạy sau khi Server khởi động 15 giây rồi 6 giờ/lần:
/// tạo trước kỳ tuần (tuần trước, tuần này, 2 tuần tới) và đồng bộ form tuần của mọi đơn vị
/// (tạo form còn thiếu, cập nhật thông tin chụp của form chưa khóa báo cáo).
/// GĐ 3 bổ sung: ghi thời điểm khóa, cảnh báo trước hạn.
/// </summary>
public class WorkWeekGeneratorService(
    IServiceScopeFactory scopeFactory,
    ILogger<WorkWeekGeneratorService> logger) : BackgroundService
{
    private const int WeeksToEnsure = 4;
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(StartupDelay, stoppingToken);

            using var timer = new PeriodicTimer(Interval);
            do
            {
                await RunOnceAsync(stoppingToken);
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Server đang tắt
        }
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var weekService = scope.ServiceProvider.GetRequiredService<IWorkWeekService>();
            var lastWeek = DateOnly.FromDateTime(DateTime.Now).AddDays(-7);
            await weekService.EnsureWeeksAsync(lastWeek, WeeksToEnsure, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Không tạo được kỳ tuần báo cáo công việc");
        }

        try
        {
            // Scope riêng: lỗi ở bước trên không làm hỏng DbContext của bước này
            using var scope = scopeFactory.CreateScope();

            // Tổ/kíp mới trên sơ đồ → đơn vị báo cáo, rồi tạo / cập nhật form mọi đơn vị
            var unitSyncService = scope.ServiceProvider.GetRequiredService<IWorkReportUnitSyncService>();
            await unitSyncService.EnsureFromOrgChartAsync(null, cancellationToken);

            var formService = scope.ServiceProvider.GetRequiredService<IWeeklyFormService>();
            await formService.SyncFormsAsync(null, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Không đồng bộ được form báo cáo công việc tuần");
        }
    }
}
