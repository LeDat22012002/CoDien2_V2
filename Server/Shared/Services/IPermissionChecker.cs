namespace Server.Shared.Services;

/// <summary>Gateway dùng để kiểm tra phiên và quyền; module Identity cài đặt.</summary>
public interface IPermissionChecker
{
    /// <summary>False khi token không còn hiệu lực: stamp đã đổi, tài khoản bị khóa, nhân viên đã nghỉ.</summary>
    Task<bool> IsSessionValidAsync(int userId, string securityStamp, CancellationToken cancellationToken);

    Task<bool> HasPermissionAsync(int userId, string permissionCode, CancellationToken cancellationToken);
}
