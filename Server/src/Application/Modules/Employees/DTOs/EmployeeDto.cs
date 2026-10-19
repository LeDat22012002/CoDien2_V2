namespace Server.Application.Modules.Employees.DTOs;

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
