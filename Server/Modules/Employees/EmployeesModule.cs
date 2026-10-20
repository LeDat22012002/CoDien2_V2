using Server.Modules.Employees.Repositories;
using Server.Modules.Employees.Repositories.Interfaces;
using Server.Modules.Employees.Services;
using Server.Modules.Employees.Services.Interfaces;

namespace Server.Modules.Employees;

public static class EmployeesModule
{
    public static IServiceCollection AddEmployeesModule(this IServiceCollection services)
    {
        services.AddScoped<IEmployeeRepository, EmployeeRepository>();
        services.AddScoped<IEmployeeService, EmployeeService>();

        return services;
    }
}
