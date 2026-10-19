using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using Server.Api.Common;
using Server.Api.Services;
using Server.Application.Common.Interfaces;

namespace Server.Api.Extensions;

public static class ApiServiceExtensions
{
    public static IServiceCollection AddApi(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddControllers();

        // Lỗi model binding trả về đúng định dạng ApiResponse
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(
                        x => x.Key,
                        x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

                return new BadRequestObjectResult(ApiResponse.Fail("Dữ liệu không hợp lệ.", errors));
            };
        });

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo { Title = "NM Cơ điện 2 API", Version = "v1" });

            var scheme = new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            };
            options.AddSecurityDefinition("Bearer", scheme);
            options.AddSecurityRequirement(new OpenApiSecurityRequirement { [scheme] = [] });
        });

        return services;
    }
}
