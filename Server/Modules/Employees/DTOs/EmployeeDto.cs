using Server.Modules.Organization.DTOs;
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

    /// <summary>Vị trí đang giữ trên sơ đồ tổ chức, vị trí chính đứng đầu; rỗng = chưa xếp vị trí.</summary>
    public IReadOnlyList<CurrentAssignmentDto> CurrentAssignments { get; init; } = [];
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
public class CreateEmployeeRequest : EmployeeRequestBase
{
    /// <summary>Vị trí ban đầu trên sơ đồ tổ chức (bổ nhiệm, hiệu lực từ hôm nay); null = chưa xếp vị trí.</summary>
    public InitialAssignmentRequest? InitialAssignment { get; set; }
}

public class UpdateEmployeeRequest : EmployeeRequestBase
{
    public string Status { get; set; } = string.Empty;
}

/// <summary>Vị trí ban đầu khi tạo nhân viên.</summary>
public class InitialAssignmentRequest
{
    public string OrgUnitCode { get; set; } = string.Empty;
    public string LevelCode { get; set; } = string.Empty;
    public string? JobTitle { get; set; }

    /// <summary>"Quyền ..." (giữ chức tạm thời).</summary>
    public bool IsActing { get; set; }

    public string? DecisionNo { get; set; }
    public string? Note { get; set; }
}

/// <summary>Keyword tìm theo mã, họ tên, email, số điện thoại.</summary>
public class EmployeeFilterRequest : PagedRequest
{
    public string? Status { get; set; }
    public string? Gender { get; set; }
    public string? EducationLevel { get; set; }

    /// <summary>Nhân viên đang giữ vị trí ở đơn vị này hoặc đơn vị con cháu.</summary>
    public int? OrgUnitId { get; set; }
}
