using Microsoft.AspNetCore.Identity;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories;
using Server.Modules.Identity.Repositories.Interfaces;
using Server.Modules.Identity.Services;
using Server.Modules.Identity.Services.Interfaces;
using Server.Shared.Services;

namespace Server.Modules.Identity;

public static class IdentityModule
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services)
    {
        services.AddOptions<AuthOptions>().BindConfiguration(AuthOptions.SectionName);
        services.AddMemoryCache();

        // Băm mật khẩu PBKDF2, có sẵn trong ASP.NET Core
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IPermissionRepository, PermissionRepository>();
        services.AddScoped<IPageRepository, PageRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IPageService, PageService>();

        // Một instance dùng cho cả quản lý quyền và cho Gateway kiểm tra quyền
        services.AddScoped<PermissionService>();
        services.AddScoped<IPermissionService>(sp => sp.GetRequiredService<PermissionService>());
        services.AddScoped<IPermissionChecker>(sp => sp.GetRequiredService<PermissionService>());

        return services;
    }
}
