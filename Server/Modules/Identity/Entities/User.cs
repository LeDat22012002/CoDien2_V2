using Server.Modules.Employees.Entities;
using Server.Shared.Entities;

namespace Server.Modules.Identity.Entities;

/// <summary>Tài khoản đăng nhập. Mỗi user gắn đúng 1 nhân viên; đăng nhập bằng Employee.EmpCode.</summary>
public class User : BaseEntity
{
    public int EmployeeId { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    /// <summary>Chỉ để gợi ý trên FE; hệ thống không bắt buộc đổi mật khẩu.</summary>
    public bool MustChangePassword { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Đổi giá trị khi đổi mật khẩu/khóa tài khoản để vô hiệu token và cache quyền cũ.</summary>
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>Gọi khi đổi/đặt lại mật khẩu, ngừng tài khoản: mọi access token cũ bị từ chối ngay.</summary>
    public void RenewSecurityStamp() => SecurityStamp = Guid.NewGuid().ToString("N");

    public Employee Employee { get; set; } = null!;
    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
