namespace Server.Modules.Identity;

/// <summary>Cấu hình mục "Identity" trong appsettings.</summary>
public class AuthOptions
{
    public const string SectionName = "Identity";

    public int RefreshTokenDays { get; set; } = 7;
    public LockoutSettings Lockout { get; set; } = new();
    public PasswordSettings Password { get; set; } = new();

    public class LockoutSettings
    {
        public int MaxFailedAttempts { get; set; } = 5;
        public int Minutes { get; set; } = 15;
    }

    public class PasswordSettings
    {
        public int MinLength { get; set; } = 8;
        public bool RequireLetter { get; set; } = true;
        public bool RequireDigit { get; set; } = true;
    }
}
