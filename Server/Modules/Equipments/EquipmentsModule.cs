using Server.Modules.Equipments.Repositories;
using Server.Modules.Equipments.Repositories.Interfaces;
using Server.Modules.Equipments.Services;
using Server.Modules.Equipments.Services.Interfaces;

namespace Server.Modules.Equipments;

public static class EquipmentsModule
{
    public static IServiceCollection AddEquipmentsModule(this IServiceCollection services)
    {
        services.AddScoped<IEquipmentRepository, EquipmentRepository>();

        services.AddScoped<IEquipmentService, EquipmentService>();

        return services;
    }
}
