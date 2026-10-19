namespace Server.Api.Gateway;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;

    /// <summary>Lấy từ User Secrets hoặc biến môi trường Jwt__SecretKey, không ghi vào appsettings.</summary>
    public string SecretKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 60;
}
