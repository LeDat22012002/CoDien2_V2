namespace Server.Shared.Services;

public interface ICurrentUserService
{
    int? UserId { get; }

    /// <summary>EmpCode của người đang đăng nhập; dùng cho CreatedBy/UpdatedBy.</summary>
    string? UserName { get; }

    bool IsAuthenticated { get; }
}
