using Server.Modules.Employees.Entities;
using Server.Modules.Identity.Entities;

namespace Server.Modules.Identity.Services.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(User user, Employee employee);

    /// <summary>Token gốc (gửi cho trình duyệt qua cookie) và mã băm SHA-256 (lưu DB).</summary>
    (string Token, string TokenHash) CreateRefreshToken();

    string HashToken(string token);
}
