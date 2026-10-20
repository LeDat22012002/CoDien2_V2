using Server.Modules.Organization.Repositories;
using Server.Modules.Organization.Repositories.Interfaces;
using Server.Modules.Organization.Services;
using Server.Modules.Organization.Services.Interfaces;

namespace Server.Modules.Organization;

public static class OrganizationModule
{
    public static IServiceCollection AddOrganizationModule(this IServiceCollection services)
    {
        services.AddScoped<IOrgChartRepository, OrgChartRepository>();
        services.AddScoped<IOrgUnitRepository, OrgUnitRepository>();
        services.AddScoped<IPositionLevelRepository, PositionLevelRepository>();
        services.AddScoped<IAssignmentRepository, AssignmentRepository>();

        services.AddScoped<IOrgChartService, OrgChartService>();
        services.AddScoped<IOrgUnitService, OrgUnitService>();
        services.AddScoped<IPositionLevelService, PositionLevelService>();
        services.AddScoped<IAssignmentService, AssignmentService>();

        return services;
    }
}
