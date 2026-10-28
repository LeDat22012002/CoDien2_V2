using Server.Data;
using Server.Modules.Employees.DTOs;
using Server.Modules.Employees.Entities;
using Server.Modules.Employees.Repositories.Interfaces;
using Server.Modules.Employees.Services.Interfaces;
using Server.Modules.Employees.Validators;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Exceptions;
using Server.Shared.Models;
using Server.Shared.Services;

namespace Server.Modules.Employees.Services;

public class EmployeeService(
    IEmployeeRepository employeeRepository,
    IAssignmentService assignmentService,
    IPermissionChecker permissionChecker,
    ICurrentUserService currentUserService,
    IFileStorageService fileStorageService,
    IUnitOfWork unitOfWork) : IEmployeeService
{
    private const string AvatarFolder = "avatars";

    /// <summary>Key lỗi của AssignmentService → tên ô nhập vị trí ban đầu trên form tạo nhân viên.</summary>
    private static readonly Dictionary<string, string> AssignmentErrorKeys = new()
    {
        ["newOrgUnitCode"] = "orgUnitCode",
        ["newLevelCode"] = "levelCode",
    };

    public async Task<PagedResult<EmployeeDto>> GetPagedAsync(
        EmployeeFilterRequest filter, CancellationToken cancellationToken)
    {
        var employeeIds = filter.OrgUnitId is { } orgUnitId
            ? await assignmentService.GetEmployeeIdsInUnitTreeAsync(orgUnitId, cancellationToken)
            : null;

        var (items, totalCount) = await employeeRepository.GetPagedAsync(filter, employeeIds, cancellationToken);
        var assignments = await GetAssignmentsByEmployeeAsync(items.Select(x => x.Id).ToList(), cancellationToken);

        return new PagedResult<EmployeeDto>
        {
            Items = items.Select(x => ToDto(x, assignments[x.Id].ToList())).ToList(),
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public async Task<EmployeeDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var employee = await employeeRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy nhân viên.");

        return await ToDtoWithAssignmentsAsync(employee, cancellationToken);
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        EmployeeRequestValidator.Validate(request);
        await EnsureEmpCodeAvailableAsync(request.EmpCode, null, cancellationToken);

        if (request.InitialAssignment is not null)
        {
            await EnsureCanManageAssignmentsAsync(cancellationToken);
        }

        var now = DateTime.UtcNow;
        var employee = new Employee
        {
            Status = EmployeeStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };
        ApplyRequest(employee, request);

        // Lưu nhân viên trước để AssignmentService tìm được theo mã; vị trí lỗi thì rollback cả nhân viên
        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            employeeRepository.Add(employee);
            await unitOfWork.SaveChangesAsync(ct);

            if (request.InitialAssignment is { } assignment)
            {
                await AssignInitialPositionAsync(employee.EmpCode, assignment, ct);
            }
        }, cancellationToken);

        return await ToDtoWithAssignmentsAsync(employee, cancellationToken);
    }

    public async Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        EmployeeRequestValidator.Validate(request);

        var employee = await employeeRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy nhân viên.");

        await EnsureEmpCodeAvailableAsync(request.EmpCode, id, cancellationToken);

        // Nghỉ việc: kết thúc mọi vị trí đang giữ, lưu chung 1 lần SaveChanges với thông tin nhân viên
        if (employee.Status == EmployeeStatus.Active && request.Status == EmployeeStatus.Inactive)
        {
            await assignmentService.EndAllActiveAsync(
                employee.Id, DateOnly.FromDateTime(DateTime.Today), cancellationToken);
        }

        ApplyRequest(employee, request);
        employee.Status = request.Status;
        employee.UpdatedAt = DateTime.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToDtoWithAssignmentsAsync(employee, cancellationToken);
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

    public async Task<EmployeeDto> UpdateAvatarAsync(int id, IFormFile? file, CancellationToken cancellationToken)
    {
        EmployeeRequestValidator.ValidateAvatar(file);

        var employee = await employeeRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy nhân viên.");

        var oldAvatarUrl = employee.AvatarUrl;
        var avatarUrl = await fileStorageService.SaveAsync(
            file!, AvatarFolder, $"{employee.EmpCode}_{DateTime.UtcNow.Ticks}", cancellationToken);
        try
        {
            employee.AvatarUrl = avatarUrl;
            employee.UpdatedAt = DateTime.UtcNow;
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            fileStorageService.Delete(avatarUrl);
            throw;
        }

        fileStorageService.Delete(oldAvatarUrl);
        return await ToDtoWithAssignmentsAsync(employee, cancellationToken);
    }

    /// <summary>Bổ nhiệm vị trí ban đầu, hiệu lực từ hôm nay; lỗi theo field đổi key cho khớp form tạo nhân viên.</summary>
    private async Task AssignInitialPositionAsync(
        string empCode, InitialAssignmentRequest assignment, CancellationToken cancellationToken)
    {
        try
        {
            await assignmentService.ChangeAsync(new ChangeAssignmentRequest
            {
                EmpCode = empCode,
                NewOrgUnitCode = assignment.OrgUnitCode,
                NewLevelCode = assignment.LevelCode,
                EffectiveDate = DateOnly.FromDateTime(DateTime.Today),
                ChangeType = AssignmentChangeTypes.Appoint,
                JobTitle = assignment.JobTitle,
                IsActing = assignment.IsActing,
                DecisionNo = assignment.DecisionNo,
                Note = assignment.Note,
            }, cancellationToken);
        }
        catch (ValidationException exception) when (exception.Errors is not null)
        {
            throw new ValidationException(exception.Message, exception.Errors.ToDictionary(
                x => AssignmentErrorKeys.GetValueOrDefault(x.Key, x.Key), x => x.Value));
        }
    }

    /// <summary>Tạo nhân viên kèm vị trí ban đầu cần thêm quyền quản lý chức vụ.</summary>
    private async Task EnsureCanManageAssignmentsAsync(CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId
            ?? throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
        if (!await permissionChecker.HasPermissionAsync(userId, PermissionCodes.Assignments.Manage, cancellationToken))
        {
            throw new ForbiddenException("Bạn không có quyền xếp vị trí trên sơ đồ tổ chức.");
        }
    }

    private async Task<ILookup<int, CurrentAssignmentDto>> GetAssignmentsByEmployeeAsync(
        IReadOnlyCollection<int> employeeIds, CancellationToken cancellationToken) =>
        (await assignmentService.GetCurrentAssignmentsAsync(employeeIds, cancellationToken))
        .ToLookup(x => x.EmployeeId);

    private async Task<EmployeeDto> ToDtoWithAssignmentsAsync(Employee employee, CancellationToken cancellationToken)
    {
        var assignments = await assignmentService.GetCurrentAssignmentsAsync([employee.Id], cancellationToken);
        return ToDto(employee, assignments);
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

        if (request is CreateEmployeeRequest { InitialAssignment: { } assignment })
        {
            assignment.OrgUnitCode = assignment.OrgUnitCode?.Trim() ?? string.Empty;
            assignment.LevelCode = assignment.LevelCode?.Trim() ?? string.Empty;
            assignment.JobTitle = NullIfEmpty(assignment.JobTitle);
            assignment.DecisionNo = NullIfEmpty(assignment.DecisionNo);
            assignment.Note = NullIfEmpty(assignment.Note);
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

    private static EmployeeDto ToDto(Employee employee, IReadOnlyList<CurrentAssignmentDto> assignments) => new()
    {
        CurrentAssignments = assignments,
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
