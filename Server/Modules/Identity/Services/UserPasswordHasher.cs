using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Services;

/// <summary>
/// Băm PBKDF2 (PasswordHasher của ASP.NET Core), đồng thời nhận được hash MD5 của hệ thống cũ
/// (tài khoản chuyển từ TEST.dbo.Tbl_TaiKhoan, lưu dạng "MD5:&lt;hex&gt;").
/// Khớp hash cũ → trả SuccessRehashNeeded để AuthService đổi sang PBKDF2 ngay khi đăng nhập.
/// </summary>
public class UserPasswordHasher : IPasswordHasher<User>
{
    public const string LegacyMd5Prefix = "MD5:";

    private readonly PasswordHasher<User> _inner = new();

    public string HashPassword(User user, string password) => _inner.HashPassword(user, password);

    public PasswordVerificationResult VerifyHashedPassword(User user, string hashedPassword, string providedPassword)
    {
        if (!hashedPassword.StartsWith(LegacyMd5Prefix, StringComparison.Ordinal))
        {
            return _inner.VerifyHashedPassword(user, hashedPassword, providedPassword);
        }

        // Giống Encryptor.MD5Hash cũ: MD5 của UTF-8, hex chữ thường, không salt
        var expected = Encoding.ASCII.GetBytes(hashedPassword[LegacyMd5Prefix.Length..].ToLowerInvariant());
        var actual = Encoding.ASCII.GetBytes(
            Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(providedPassword))).ToLowerInvariant());

        return CryptographicOperations.FixedTimeEquals(expected, actual)
            ? PasswordVerificationResult.SuccessRehashNeeded
            : PasswordVerificationResult.Failed;
    }
}
