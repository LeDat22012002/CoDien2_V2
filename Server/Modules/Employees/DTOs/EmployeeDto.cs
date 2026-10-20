using Server.Shared.Models;

namespace Server.Modules.Employees.DTOs;

// ===== Response =====

public class EmployeeDto
{
    public int Id { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public DateOnly? BirthDate { get; init; }
    public string? EducationLevel { get; init; }
    public string? Major { get; init; }
    public string? Gender { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? AvatarUrl { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

// ===== Request =====

/// <summary>Các trường dùng chung cho tạo mới và cập nhật nhân viên.</summary>
public abstract class EmployeeRequestBase
{
    public string EmpCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateOnly? BirthDate { get; set; }
    public string? EducationLevel { get; set; }
    public string? Major { get; set; }
    public string? Gender { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
}

/// <summary>Nhân viên mới luôn có Status = ACTIVE.</summary>
public class CreateEmployeeRequest : EmployeeRequestBase;

public class UpdateEmployeeRequest : EmployeeRequestBase
{
    public string Status { get; set; } = string.Empty;
}

/// <summary>Keyword tìm theo mã, họ tên, email, số điện thoại.</summary>
public class EmployeeFilterRequest : PagedRequest
{
    public string? Status { get; set; }
    public string? Gender { get; set; }
    public string? EducationLevel { get; set; }
}
