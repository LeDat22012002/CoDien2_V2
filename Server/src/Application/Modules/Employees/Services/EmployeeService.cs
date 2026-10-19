using Server.Application.Common.Exceptions;
using Server.Application.Common.Interfaces;
using Server.Application.Common.Models;
using Server.Application.Modules.Employees.DTOs;
using Server.Application.Modules.Employees.Interfaces;
using Server.Application.Modules.Employees.Validators;
using Server.Domain.Modules.Employees.Entities;

namespace Server.Application.Modules.Employees.Services;

public class EmployeeService(IEmployeeRepository employeeRepository, IUnitOfWork unitOfWork) : IEmployeeService
{
    public async Task<PagedResult<EmployeeDto>> GetPagedAsync(
        EmployeeFilterRequest filter, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await employeeRepository.GetPagedAsync(filter, cancellationToken);

        return new PagedResult<EmployeeDto>
        {
            Items = items.Select(ToDto).ToList(),
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public async Task<EmployeeDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var employee = await employeeRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy nhân viên.");

        return ToDto(employee);
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        EmployeeRequestValidator.Validate(request);
        await EnsureEmpCodeAvailableAsync(request.EmpCode, null, cancellationToken);

        var now = DateTime.UtcNow;
        var employee = new Employee
        {
            Status = EmployeeStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };
        ApplyRequest(employee, request);

        employeeRepository.Add(employee);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(employee);
    }

    public async Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        EmployeeRequestValidator.Validate(request);

        var employee = await employeeRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy nhân viên.");

        await EnsureEmpCodeAvailableAsync(request.EmpCode, id, cancellationToken);

        ApplyRequest(employee, request);
        employee.Status = request.Status;
        employee.UpdatedAt = DateTime.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(employee);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var employee = await employeeRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy nhân viên.");

        if (await employeeRepository.HasAssignmentsAsync(id, cancellationToken))
        {
            throw new BusinessException(
                "Không thể xóa nhân viên đã có quá trình công tác. Hãy chuyển trạng thái sang INACTIVE.");
        }

        employeeRepository.Remove(employee);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureEmpCodeAvailableAsync(string empCode, int? excludeId, CancellationToken cancellationToken)
    {
        if (await employeeRepository.IsEmpCodeTakenAsync(empCode, excludeId, cancellationToken))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["empCode"] = [$"Mã nhân viên '{empCode}' đã tồn tại."],
            });
        }
    }

    /// <summary>Cắt khoảng trắng; chuỗi rỗng ở trường không bắt buộc coi như null.</summary>
    private static void Normalize(EmployeeRequestBase request)
    {
        request.EmpCode = request.EmpCode?.Trim() ?? string.Empty;
        request.FullName = request.FullName?.Trim() ?? string.Empty;
        request.EducationLevel = NullIfEmpty(request.EducationLevel);
        request.Major = NullIfEmpty(request.Major);
        request.Gender = NullIfEmpty(request.Gender);
        request.Email = NullIfEmpty(request.Email);
        request.Phone = NullIfEmpty(request.Phone);
        request.AvatarUrl = NullIfEmpty(request.AvatarUrl);

        if (request is UpdateEmployeeRequest updateRequest)
        {
            updateRequest.Status = updateRequest.Status?.Trim().ToUpperInvariant() ?? string.Empty;
        }
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void ApplyRequest(Employee employee, EmployeeRequestBase request)
    {
        employee.EmpCode = request.EmpCode;
        employee.FullName = request.FullName;
        employee.BirthDate = request.BirthDate;
        employee.EducationLevel = request.EducationLevel;
        employee.Major = request.Major;
        employee.Gender = request.Gender;
        employee.Email = request.Email;
        employee.Phone = request.Phone;
        employee.AvatarUrl = request.AvatarUrl;
    }

    private static EmployeeDto ToDto(Employee employee) => new()
    {
        Id = employee.Id,
        EmpCode = employee.EmpCode,
        FullName = employee.FullName,
        BirthDate = employee.BirthDate,
        EducationLevel = employee.EducationLevel,
        Major = employee.Major,
        Gender = employee.Gender,
        Email = employee.Email,
        Phone = employee.Phone,
        AvatarUrl = employee.AvatarUrl,
        Status = employee.Status,
        CreatedAt = employee.CreatedAt,
        UpdatedAt = employee.UpdatedAt,
    };
}
