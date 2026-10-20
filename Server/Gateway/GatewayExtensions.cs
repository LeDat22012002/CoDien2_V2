using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Server.Gateway.Authorization;
using Server.Shared.Constants;
using Server.Shared.Models;
using Server.Shared.Services;

namespace Server.Gateway;

/// <summary>Điểm vào duy nhất: xác thực JWT, CORS, rate limit.</summary>
public static class GatewayExtensions
{
    private const string CorsPolicyName = "ClientCors";

    public static IServiceCollection AddGateway(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
        if (string.IsNullOrWhiteSpace(jwtOptions.SecretKey))
        {
            throw new InvalidOperationException(
                "Thiếu Jwt:SecretKey. Đặt bằng 'dotnet user-secrets set Jwt:SecretKey <key>' hoặc biến môi trường Jwt__SecretKey.");
        }

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Giữ nguyên tên claim trong JWT (sub, emp_code…) thay vì đổi sang ClaimTypes của .NET
                options.MapInboundClaims = false;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    NameClaimType = AppClaimTypes.EmpCode,
                    ValidateIssuer = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtOptions.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                };

                options.Events = new JwtBearerEvents
                {
                    // Token hợp lệ về chữ ký vẫn bị từ chối nếu tài khoản đã bị khóa / đổi mật khẩu sau khi cấp token
                    OnTokenValidated = async context =>
                    {
                        var principal = context.Principal!;
                        if (!int.TryParse(principal.FindFirstValue(AppClaimTypes.UserId), out var userId))
                        {
                            context.Fail("Token thiếu mã người dùng.");
                            return;
                        }

                        var securityStamp = principal.FindFirstValue(AppClaimTypes.SecurityStamp) ?? string.Empty;
                        var permissionChecker = context.HttpContext.RequestServices.GetRequiredService<IPermissionChecker>();
                        if (!await permissionChecker.IsSessionValidAsync(
                                userId, securityStamp, context.HttpContext.RequestAborted))
                        {
                            context.Fail("Phiên đăng nhập không còn hiệu lực.");
                        }
                    },
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await context.Response.WriteAsJsonAsync(
                            ApiResponse.Fail("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
                    },
                    OnForbidden = async context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        await context.Response.WriteAsJsonAsync(
                            ApiResponse.Fail("Bạn không có quyền thực hiện thao tác này."));
                    },
                };
            });

        // Mọi API mặc định yêu cầu đăng nhập; endpoint đăng nhập đánh dấu [AllowAnonymous]
        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        // [HasPermission("...")]: policy tạo động, kiểm tra quyền qua IPermissionChecker
        services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        services.AddCors(options => options.AddPolicy(CorsPolicyName, policy => policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));

        var permitLimit = configuration.GetValue("RateLimit:PermitLimit", 100);
        var windowSeconds = configuration.GetValue("RateLimit:WindowSeconds", 60);
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = permitLimit,
                        Window = TimeSpan.FromSeconds(windowSeconds),
                    }));
            options.OnRejected = async (context, cancellationToken) =>
                await context.HttpContext.Response.WriteAsJsonAsync(
                    ApiResponse.Fail("Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau."), cancellationToken);
        });

        return services;
    }

    public static WebApplication UseGateway(this WebApplication app)
    {
        app.UseCors(CorsPolicyName);
        app.UseAuthentication();
        app.UseRateLimiter();
        app.UseAuthorization();
        return app;
    }
}
