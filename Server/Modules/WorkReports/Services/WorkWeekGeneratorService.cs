using Server.Modules.WorkReports.Services.Interfaces;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Tác vụ nền: tạo trước kỳ tuần (tuần trước, tuần này, 2 tuần tới). Chạy sau khi Server khởi động 15 giây, sau đó 6 giờ/lần.
/// GĐ 2–3 sẽ bổ sung: tạo form trống cho đơn vị, ghi thời điểm khóa, cảnh báo trước hạn.
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
    }
}