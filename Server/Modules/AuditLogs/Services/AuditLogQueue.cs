using System.Threading.Channels;
using Server.Modules.AuditLogs.Entities;
using Server.Modules.AuditLogs.Services.Interfaces;

namespace Server.Modules.AuditLogs.Services;

public class AuditLogQueue(ILogger<AuditLogQueue> logger) : IAuditLogQueue
{
    private const int Capacity = 10_000;

    private readonly Channel<AuditLog> _channel = Channel.CreateBounded<AuditLog>(new BoundedChannelOptions(Capacity)
    {
        FullMode = BoundedChannelFullMode.Wait,
        SingleReader = true,
    });

    public ChannelReader<AuditLog> Reader => _channel.Reader;

    public void Enqueue(AuditLog log)
    {
        if (!_channel.Writer.TryWrite(log))
        {
            logger.LogWarning("Hàng đợi nhật ký đầy, bỏ log {Type} {Path}", log.Type, log.Path);
        }
    }
}
