namespace Server.Shared.Services;

public interface ICurrentUserService
{
    string? UserName { get; }
    bool IsAuthenticated { get; }
}
