using System.Threading.Channels;
using Server.Modules.AuditLogs.Entities;

namespace Server.Modules.AuditLogs.Services.Interfaces;

/// <summary>Hàng đợi log trong bộ nhớ: request chỉ đẩy vào, AuditLogWriterService ghi DB theo lô ở nền.</summary>
public interface IAuditLogQueue
{
    /// <summary>Hàng đợi đầy (DB chậm / lỗi kéo dài) thì bỏ log, không làm chậm request.</summary>
    void Enqueue(AuditLog log);

    ChannelReader<AuditLog> Reader { get; }
}
