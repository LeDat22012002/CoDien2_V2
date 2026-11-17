using Server.Modules.Materials.Repositories;
using Server.Modules.Materials.Repositories.Interfaces;
using Server.Modules.Materials.Services;
using Server.Modules.Materials.Services.Interfaces;

namespace Server.Modules.Materials;

public static class MaterialsModule
{
    public static IServiceCollection AddMaterialsModule(this IServiceCollection services)
    {
        services.AddScoped<IMaterialRepository, MaterialRepository>();

        services.AddScoped<IMaterialService, MaterialService>();

        return services;
    }
}