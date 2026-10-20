using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Server.Data;
using Server.Modules.Employees.Entities;
using Server.Modules.Identity.DTOs;
using Server.Modules.Identity.Entities;
using Server.Modules.Identity.Repositories.Interfaces;
using Server.Modules.Identity.Services.Interfaces;
using Server.Modules.Identity.Validators;
using Server.Shared.Exceptions;
using Server.Shared.Services;

namespace Server.Modules.Identity.Services;

public class AuthService(
    IUserRepository userRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IPageRepository pageRepository,
    ITokenService tokenService,
    IPermissionService permissionService,
    IPasswordHasher<User> passwordHasher,
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IOptions<AuthOptions> authOptions,
    ILogger<AuthService> logger) : IAuthService
{
    private const string InvalidCredentialsMessage = "Mã nhân viên hoặc mật khẩu không đúng.";
    private const string SessionExpiredMessage = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";

    private readonly AuthOptions _options = authOptions.Value;

    public async Task<AuthSession> LoginAsync(
        LoginRequest request, string? clientIp, CancellationToken cancellationToken)
    {
        AuthRequestValidator.Validate(request);

        // Không phân biệt "sai mã" và "sai mật khẩu" để không lộ mã nào có tài khoản
        var user = await userRepository.FindByEmpCodeAsync(request.EmpCode.Trim(), cancellationToken)
            ?? throw new BusinessException(InvalidCredentialsMessage);

        var now = DateTime.UtcNow;
        if (user.LockoutEnd > now)
        {
            throw new BusinessException(GetLockedMessage(user.LockoutEnd.Value, now));
        }

        var verifyResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            await RegisterFailedLoginAsync(user, now, cancellationToken);
        }

        EnsureCanSignIn(user);

        if (verifyResult == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        }

        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        user.LastLoginAt = now;

        var session = IssueSession(user, clientIp, now);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return session;
    }

    public async Task<AuthSession> RefreshAsync(
        string? refreshToken, string? clientIp, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
        {
            throw new UnauthorizedException(SessionExpiredMessage);
        }

        var storedToken = await refreshTokenRepository.FindByHashAsync(
                tokenService.HashToken(refreshToken), cancellationToken)
            ?? throw new UnauthorizedException(SessionExpiredMessage);

        var now = DateTime.UtcNow;
        if (storedToken.RevokedAt is not null)
        {
            // Token đã thu hồi mà vẫn bị dùng lại → nghi bị đánh cắp: thu hồi mọi phiên của user
            logger.LogWarning("Refresh token đã thu hồi bị dùng lại, thu hồi mọi phiên của user {UserId}", storedToken.UserId);
            await refreshTokenRepository.RevokeAllAsync(storedToken.UserId, now, cancellationToken);
            throw new UnauthorizedException(SessionExpiredMessage);
        }

        if (storedToken.ExpiresAt <= now)
        {
            throw new UnauthorizedException(SessionExpiredMessage);
        }

        var user = storedToken.User;
        if (!user.IsActive || user.Employee.Status != EmployeeStatus.Active)
        {
            storedToken.RevokedAt = now;
            await unitOfWork.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedException("Tài khoản không còn được phép đăng nhập.");
        }

        var session = IssueSession(user, clientIp, now);
        storedToken.RevokedAt = now;
        storedToken.ReplacedByTokenHash = tokenService.HashToken(session.RefreshToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return session;
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
        {
            return;
        }

        var storedToken = await refreshTokenRepository.FindByHashAsync(
            tokenService.HashToken(refreshToken), cancellationToken);
        if (storedToken is { RevokedAt: null })
        {
            storedToken.RevokedAt = DateTime.UtcNow;
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<MeDto> GetMeAsync(CancellationToken cancellationToken)
    {
        var state = await permissionService.GetCurrentUserStateAsync(cancellationToken);
        var user = await userRepository.GetByIdAsync(state.UserId, cancellationToken)
            ?? throw new UnauthorizedException(SessionExpiredMessage);

        var visiblePages = (await pageRepository.GetAllAsync(cancellationToken))
            .Where(x => x.IsActive && CanSeePage(x, state))
            .ToList();

        return new MeDto
        {
            User = new CurrentUserDto
            {
                Id = user.Id,
                EmployeeId = user.EmployeeId,
                EmpCode = user.EmpCode,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
            },
            IsSuperAdmin = state.IsSuperAdmin,
            Roles = state.Roles,
            Permissions = state.PermissionCodes.Order().ToList(),
            Menu = BuildMenu(visiblePages.Where(x => x.IsMenu).ToList(), parentId: null),
            Routes = visiblePages.Where(x => x.Path is not null).Select(x => x.Path!).Distinct().ToList(),
        };
    }

    public async Task<AuthSession> ChangePasswordAsync(
        ChangePasswordRequest request, string? clientIp, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new UnauthorizedException(SessionExpiredMessage);
        AuthRequestValidator.Validate(request, _options.Password);

        var user = await userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new UnauthorizedException(SessionExpiredMessage);

        if (passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword)
            == PasswordVerificationResult.Failed)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["currentPassword"] = ["Mật khẩu hiện tại không đúng."],
            });
        }

        var now = DateTime.UtcNow;
        var session = await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
            user.MustChangePassword = false;
            user.RenewSecurityStamp();
            await refreshTokenRepository.RevokeAllAsync(user.Id, now, ct);
            return IssueSession(user, clientIp, now);
        }, cancellationToken);

        permissionService.InvalidateUser(user.Id);
        return session;
    }

    private async Task RegisterFailedLoginAsync(User user, DateTime now, CancellationToken cancellationToken)
    {
        user.FailedLoginCount++;
        if (user.FailedLoginCount >= _options.Lockout.MaxFailedAttempts)
        {
            user.FailedLoginCount = 0;
            user.LockoutEnd = now.AddMinutes(_options.Lockout.Minutes);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            throw new BusinessException(GetLockedMessage(user.LockoutEnd.Value, now));
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
        throw new BusinessException(InvalidCredentialsMessage);
    }

    private static void EnsureCanSignIn(User user)
    {
        if (!user.IsActive)
        {
            throw new BusinessException("Tài khoản đã bị ngừng sử dụng. Vui lòng liên hệ quản trị viên.");
        }

        if (user.Employee.Status != EmployeeStatus.Active)
        {
            throw new BusinessException("Nhân viên không còn làm việc, không thể đăng nhập.");
        }
    }

    private static string GetLockedMessage(DateTime lockoutEnd, DateTime now) =>
        $"Tài khoản tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau {Math.Ceiling((lockoutEnd - now).TotalMinutes)} phút.";

    /// <summary>Tạo access token + refresh token mới (refresh token được thêm vào DbContext, chưa lưu).</summary>
    private AuthSession IssueSession(User user, string? clientIp, DateTime now)
    {
        var (accessToken, accessExpiresAt) = tokenService.CreateAccessToken(user, user.Employee);
        var (refreshToken, refreshTokenHash) = tokenService.CreateRefreshToken();
        var refreshExpiresAt = now.AddDays(_options.RefreshTokenDays);

        refreshTokenRepository.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = refreshExpiresAt,
            CreatedAt = now,
            CreatedByIp = clientIp,
        });

        var result = new AuthResultDto
        {
            AccessToken = accessToken,
            ExpiresAt = accessExpiresAt,
            User = new CurrentUserDto
            {
                Id = user.Id,
                EmployeeId = user.EmployeeId,
                EmpCode = user.Employee.EmpCode,
                FullName = user.Employee.FullName,
                AvatarUrl = user.Employee.AvatarUrl,
            },
        };

        return new AuthSession(result, refreshToken, refreshExpiresAt);
    }

    private static bool CanSeePage(PageDto page, UserAuthState state) =>
        page.PermissionCode is null || state.IsSuperAdmin || state.PermissionCodes.Contains(page.PermissionCode);

    /// <summary>Dựng cây menu; nút nhóm (không có Path) bị bỏ nếu không còn trang con nào hiển thị.</summary>
    private static List<MenuItemDto> BuildMenu(List<PageDto> pages, int? parentId) =>
        pages
            .Where(x => x.ParentId == parentId)
            .Select(x => new MenuItemDto
            {
                Code = x.Code,
                Title = x.Title,
                Path = x.Path,
                Icon = x.Icon,
                Children = BuildMenu(pages, x.Id),
            })
            .Where(x => x.Path is not null || x.Children.Count > 0)
            .ToList();
}
