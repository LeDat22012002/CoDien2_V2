namespace Server.Application.Modules.Employees.DTOs;

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
