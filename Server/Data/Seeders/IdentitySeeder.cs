using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Server.Modules.Employees.Entities;
using Server.Modules.Identity.Entities;

namespace Server.Data.Seeders;

/// <summary>
/// Chạy mỗi lần khởi động, an toàn khi chạy lặp lại. Không ghi đè dữ liệu admin đã chỉnh trên FE:
/// - Permission: chỉ thêm mã mới khai báo trong code.
/// - Page: chỉ tạo bộ trang mặc định khi bảng Page còn trống; sau đó quản lý hoàn toàn từ FE.
/// - Tạo role SUPER_ADMIN và admin tổng đầu tiên nếu chưa có.
/// </summary>
public class IdentitySeeder(
    AppDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration,
    ILogger<IdentitySeeder> logger)
{
    private const string SystemActor = "system";

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        await AddNewPermissionsAsync(cancellationToken);
        await SeedDefaultPagesAsync(cancellationToken);
        var superAdminRole = await EnsureSuperAdminRoleAsync(cancellationToken);
        await EnsureSuperAdminUserAsync(superAdminRole, cancellationToken);
    }

    /// <summary>Mã quyền do code định nghĩa: chỉ thêm mã mới, không sửa tên/thứ tự admin đã chỉnh.</summary>
    private async Task AddNewPermissionsAsync(CancellationToken cancellationToken)
    {
        var existingCodes = (await dbContext.Set<Permission>()
            .Select(x => x.Code)
            .ToListAsync(cancellationToken))
            .ToHashSet();

        foreach (var seed in IdentitySeedData.Permissions.Where(x => !existingCodes.Contains(x.Code)))
        {
            dbContext.Add(new Permission
            {
                Code = seed.Code,
                Name = seed.Name,
                Module = seed.Module,
                SortOrder = seed.SortOrder,
            });
            logger.LogInformation("Đã thêm quyền mới {Code}", seed.Code);
        }

        // Không tự xóa quyền đã bỏ khỏi code để tránh mất phân quyền vì sửa nhầm; chỉ cảnh báo
        var seedCodes = IdentitySeedData.Permissions.Select(x => x.Code).ToHashSet();
        foreach (var obsoleteCode in existingCodes.Where(code => !seedCodes.Contains(code)))
        {
            logger.LogWarning("Quyền {Code} có trong DB nhưng code không còn khai báo", obsoleteCode);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Chỉ chạy lần cài đặt đầu (bảng Page trống). Sau đó trang được quản lý hoàn toàn từ FE.</summary>
    private async Task SeedDefaultPagesAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Set<Page>().AnyAsync(cancellationToken))
        {
            return;
        }

        var permissionIds = await dbContext.Set<Permission>()
            .ToDictionaryAsync(x => x.Code, x => x.Id, cancellationToken);
        var pages = new Dictionary<string, Page>();

        // Duyệt theo thứ tự khai báo: trang cha phải khai báo trước trang con
        foreach (var seed in IdentitySeedData.Pages)
        {
            var page = new Page
            {
                Code = seed.Code,
                Title = seed.Title,
                Path = seed.Path,
                Icon = seed.Icon,
                Parent = seed.ParentCode is null ? null : pages[seed.ParentCode],
                PermissionId = seed.PermissionCode is null ? null : permissionIds[seed.PermissionCode],
                SortOrder = seed.SortOrder,
                IsMenu = seed.IsMenu,
                IsActive = true,
            };
            dbContext.Add(page);
            pages[seed.Code] = page;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Đã tạo {Count} trang mặc định", pages.Count);
    }

    private async Task<Role> EnsureSuperAdminRoleAsync(CancellationToken cancellationToken)
    {
        var role = await dbContext.Set<Role>()
            .FirstOrDefaultAsync(x => x.Code == RoleCodes.SuperAdmin, cancellationToken);

        if (role is null)
        {
            role = new Role
            {
                Code = RoleCodes.SuperAdmin,
                Name = "Quản trị viên tổng",
                Description = "Có toàn quyền trên hệ thống, cấp quyền cho các vai trò khác.",
                IsSystem = true,
                IsActive = true,
            };
            dbContext.Add(role);
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Đã tạo role {Code}", RoleCodes.SuperAdmin);
        }

        return role;
    }

    private async Task EnsureSuperAdminUserAsync(Role superAdminRole, CancellationToken cancellationToken)
    {
        var hasSuperAdmin = await dbContext.Set<UserRole>()
            .AnyAsync(x => x.RoleId == superAdminRole.Id && x.User.IsActive, cancellationToken);
        if (hasSuperAdmin)
        {
            return;
        }

        var empCode = configuration["Identity:SuperAdmin:EmpCode"];
        var initialPassword = configuration["Identity:SuperAdmin:InitialPassword"];
        if (string.IsNullOrWhiteSpace(empCode) || string.IsNullOrWhiteSpace(initialPassword))
        {
            logger.LogWarning(
                "Chưa có admin tổng. Đặt Identity:SuperAdmin:EmpCode và Identity:SuperAdmin:InitialPassword trong User Secrets.");
            return;
        }

        var employee = await dbContext.Set<Employee>()
            .FirstOrDefaultAsync(x => x.EmpCode == empCode, cancellationToken);
        if (employee is null)
        {
            logger.LogWarning("Không tìm thấy nhân viên {EmpCode} để tạo admin tổng", empCode);
            return;
        }

        var user = await dbContext.Set<User>()
            .FirstOrDefaultAsync(x => x.EmployeeId == employee.Id, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                EmployeeId = employee.Id,
                IsActive = true,
                MustChangePassword = true,
            };
            user.PasswordHash = passwordHasher.HashPassword(user, initialPassword);
            dbContext.Add(user);
        }

        dbContext.Add(new UserRole
        {
            User = user,
            RoleId = superAdminRole.Id,
            AssignedAt = DateTime.UtcNow,
            AssignedBy = SystemActor,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Đã tạo admin tổng cho nhân viên {EmpCode}", empCode);
    }
}
