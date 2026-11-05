namespace Server.Modules.Identity.Entities;

/// <summary>Chỉ lưu SHA-256 của refresh token. Mỗi lần refresh: thu hồi token cũ, cấp token mới (xoay vòng).</summary>
public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedByIp { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    /// <summary>
    /// "Nhớ mật khẩu" khi đăng nhập: cookie lưu lại sau khi đóng trình duyệt, hạn RememberMeDays.
    /// False: cookie phiên (đóng trình duyệt là mất), hạn RefreshTokenDays. Token xoay vòng giữ nguyên giá trị này.
    /// </summary>
    public bool IsPersistent { get; set; }

    public User User { get; set; } = null!;
}
