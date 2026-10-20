using Server.Shared.Models;

namespace Server.Modules.Identity.DTOs;

// ===== Response =====

public class UserDto
{
    public int Id { get; init; }
    public int EmployeeId { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public string EmployeeStatus { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public bool IsLocked { get; init; }
    public DateTime? LockoutEnd { get; init; }
    public DateTime? LastLoginAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public IReadOnlyList<RoleSummaryDto> Roles { get; init; } = [];
}

/// <summary>Nhân viên đang làm việc, chưa có tài khoản (cho ô chọn khi tạo tài khoản).</summary>
public class AvailableEmployeeDto
{
    public int Id { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
}

// ===== Request =====

public class CreateUserRequest
{
    public int EmployeeId { get; set; }
    public string Password { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public List<int> RoleIds { get; set; } = [];
}

public class UpdateUserRequest
{
    public bool IsActive { get; set; }
    public List<int> RoleIds { get; set; } = [];
}

public class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>Keyword tìm theo mã, họ tên nhân viên.</summary>
public class UserFilterRequest : PagedRequest
{
    public int? RoleId { get; set; }
    public bool? IsActive { get; set; }
}
