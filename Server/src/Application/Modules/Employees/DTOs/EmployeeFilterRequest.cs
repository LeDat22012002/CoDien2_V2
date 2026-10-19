using Server.Application.Common.Models;

namespace Server.Application.Modules.Employees.DTOs;

/// <summary>Keyword tìm theo mã, họ tên, email, số điện thoại.</summary>
public class EmployeeFilterRequest : PagedRequest
{
    public string? Status { get; set; }
    public string? Gender { get; set; }
    public string? EducationLevel { get; set; }
}
