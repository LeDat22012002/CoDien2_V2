namespace Server.Application.Modules.Employees.DTOs;

public class UpdateEmployeeRequest : EmployeeRequestBase
{
    public string Status { get; set; } = string.Empty;
}
