namespace Server.Domain.Modules.Employees.Entities;

/// <summary>Bảng dbo.Employee có sẵn, chưa có cột CreatedBy/UpdatedBy/IsDeleted nên không kế thừa BaseEntity.</summary>
public class Employee
{
    public int Id { get; set; }
    public string EmpCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateOnly? BirthDate { get; set; }
    public string? EducationLevel { get; set; }
    public string? Major { get; set; }
    public string? Gender { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string Status { get; set; } = EmployeeStatus.Active;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
