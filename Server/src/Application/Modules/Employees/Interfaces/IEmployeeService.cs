using Server.Application.Common.Models;
using Server.Application.Modules.Employees.DTOs;

namespace Server.Application.Modules.Employees.Interfaces;

public interface IEmployeeService
{
    Task<PagedResult<EmployeeDto>> GetPagedAsync(EmployeeFilterRequest filter, CancellationToken cancellationToken);

    Task<EmployeeDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken);

    Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}
