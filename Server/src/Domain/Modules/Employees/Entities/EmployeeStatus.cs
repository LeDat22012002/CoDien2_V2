namespace Server.Domain.Modules.Employees.Entities;

/// <summary>Giá trị cột Employee.Status.</summary>
public static class EmployeeStatus
{
    public const string Active = "ACTIVE";
    public const string Inactive = "INACTIVE";

    public static readonly IReadOnlyCollection<string> All = [Active, Inactive];
}
