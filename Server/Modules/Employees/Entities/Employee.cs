namespace Server.Modules.Employees.Entities;

// ===== Entity =====

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

// ===== Giá trị hợp lệ (lưu nguyên văn như dữ liệu hiện có) =====

/// <summary>Giá trị cột Employee.Status.</summary>
public static class EmployeeStatus
{
    public const string Active = "ACTIVE";
    public const string Inactive = "INACTIVE";

    public static readonly IReadOnlyCollection<string> All = [Active, Inactive];
}

/// <summary>Giá trị cột Employee.Gender.</summary>
public static class Gender
{
    public const string Male = "Nam";
    public const string Female = "Nữ";

    public static readonly IReadOnlyCollection<string> All = [Male, Female];
}

/// <summary>Giá trị cột Employee.EducationLevel.</summary>
public static class EducationLevel
{
    public const string University = "ĐH";
    public const string College = "CĐ";
    public const string Intermediate = "TC";
    public const string Elementary = "SC";
    public const string SkilledWorker = "CNKT";

    public static readonly IReadOnlyCollection<string> All = [University, College, Intermediate, Elementary, SkilledWorker];
}
