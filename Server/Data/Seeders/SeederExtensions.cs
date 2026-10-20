namespace Server.Data.Seeders;

public static class SeederExtensions
{
    public static IServiceCollection AddSeeders(this IServiceCollection services)
    {
        services.AddScoped<IdentitySeeder>();
        return services;
    }

    /// <summary>Chạy các seeder khi khởi động (mỗi lần một scope riêng vì DbContext là Scoped).</summary>
    public static async Task SeedDataAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IdentitySeeder>().SeedAsync(CancellationToken.None);
    }
}
