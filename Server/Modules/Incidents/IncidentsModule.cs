using Server.Modules.Incidents.Repositories;
using Server.Modules.Incidents.Repositories.Interfaces;
using Server.Modules.Incidents.Services;
using Server.Modules.Incidents.Services.Interfaces;

namespace Server.Modules.Incidents;

public static class IncidentsModule
{
    public static IServiceCollection AddIncidentsModule(this IServiceCollection services)
    {
        services.AddScoped<IIncidentRepository, IncidentRepository>();
        services.AddScoped<IIncidentDashboardRepository, IncidentDashboardRepository>();

        services.AddScoped<IIncidentService, IncidentService>();
        services.AddScoped<IIncidentDashboardService, IncidentDashboardService>();
        services.AddScoped<IIncidentLookupService, IncidentLookupService>();

        return services;
    }
}
