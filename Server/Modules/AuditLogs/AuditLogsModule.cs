using Server.Modules.AuditLogs.Repositories;
using Server.Modules.AuditLogs.Repositories.Interfaces;
using Server.Modules.AuditLogs.Services;
using Server.Modules.AuditLogs.Services.Interfaces;

namespace Server.Modules.AuditLogs;

public static class AuditLogsModule
{
    public static IServiceCollection AddAuditLogsModule(this IServiceCollection services)
    {
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();

        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddSingleton<IAuditLogQueue, AuditLogQueue>();

        services.AddHostedService<AuditLogWriterService>();
        services.AddHostedService<AuditLogCleanupService>();

        return services;
    }
}
