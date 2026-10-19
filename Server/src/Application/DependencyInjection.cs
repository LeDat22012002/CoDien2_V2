using Microsoft.Extensions.DependencyInjection;

namespace Server.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Tự đăng ký mọi class tên kết thúc bằng "Service" theo interface của nó (I<Module>Service)
        services.Scan(scan => scan
            .FromAssemblies(typeof(DependencyInjection).Assembly)
            .AddClasses(classes => classes.Where(type => type.Name.EndsWith("Service")))
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        return services;
    }
}
