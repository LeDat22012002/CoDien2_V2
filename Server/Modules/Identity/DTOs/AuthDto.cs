namespace Server.Modules.Identity.DTOs;

// ===== Response =====

public class AuthResultDto
{
    public string AccessToken { get; init; } = string.Empty;
    public DateTime ExpiresAt { get; init; }
    public CurrentUserDto User { get; init; } = new();
}

public class CurrentUserDto
{
    public int Id { get; init; }
    public int EmployeeId { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
}

/// <summary>Thông tin để FE dựng menu, chặn route và ẩn/hiện nút theo quyền.</summary>
public class MeDto
{
    public CurrentUserDto User { get; init; } = new();
    public bool IsSuperAdmin { get; init; }
    public IReadOnlyList<RoleSummaryDto> Roles { get; init; } = [];
    public IReadOnlyList<string> Permissions { get; init; } = [];
    public IReadOnlyList<MenuItemDto> Menu { get; init; } = [];

    /// <summary>Mọi route user được vào, kể cả trang không hiện trên menu.</summary>
    public IReadOnlyList<string> Routes { get; init; } = [];
}

public class MenuItemDto
{
    public string Code { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Path { get; init; }
    public string? ExternalUrl { get; init; }
    public string? Icon { get; init; }
    public IReadOnlyList<MenuItemDto> Children { get; init; } = [];
}

// ===== Request =====

public class LoginRequest
{
    public string EmpCode { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

// ===== Nội bộ (không trả ra API) =====

/// <summary>Kết quả đăng nhập/refresh: controller đặt RefreshToken vào cookie HttpOnly, còn lại trả JSON.</summary>
public record AuthSession(AuthResultDto Result, string RefreshToken, DateTime RefreshTokenExpiresAt);

/// <summary>Trạng thái phân quyền của user, được cache trong bộ nhớ.</summary>
public record UserAuthState(
    int UserId,
    string SecurityStamp,
    bool IsActive,
    bool IsEmployeeActive,
    bool IsSuperAdmin,
    IReadOnlyList<RoleSummaryDto> Roles,
    IReadOnlySet<string> PermissionCodes,
    IReadOnlySet<int> PermissionIds);
