using Server.Data;
using Server.Modules.Employees.Entities;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;
using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.Organization.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.Organization.Services;

public class AssignmentService(IAssignmentRepository assignmentRepository, IUnitOfWork unitOfWork) : IAssignmentService
{
    /// <summary>
    /// Chuyển từ usp_ChangeAssignment, có sửa cho khớp DB hiện tại:
    /// - Xác định "cấp trưởng" theo loại đơn vị (OrgUnit.HeadLevelCode ?? OrgUnitType.HeadLevelCode) và SingleHead,
    ///   thay cho cột PositionLevel.IsHead không còn tồn tại.
    /// - Bổ sung kiểm tra ngày hiệu lực so với vị trí đang giữ.
    /// - Điền CreatedAt cho vị trí mới.
    /// </summary>
    public async Task ChangeAsync(ChangeAssignmentRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        AssignmentRequestValidator.Validate(request);

        var employee = await assignmentRepository.GetEmployeeByCodeAsync(request.EmpCode, cancellationToken);
        if (employee is not { Status: EmployeeStatus.Active })
        {
            throw FieldError("empCode", $"Không tìm thấy nhân viên đang làm việc có mã '{request.EmpCode}'.");
        }

        var orgUnit = await assignmentRepository.GetActiveUnitByCodeAsync(request.NewOrgUnitCode, cancellationToken)
            ?? throw FieldError("newOrgUnitCode", $"Không tìm thấy đơn vị '{request.NewOrgUnitCode}'.");

        if (!await assignmentRepository.IsLevelActiveAsync(request.NewLevelCode, cancellationToken))
        {
            throw FieldError("newLevelCode", $"Cấp bậc '{request.NewLevelCode}' không hợp lệ.");
        }

        // Đơn vị chỉ 1 trưởng đã có trưởng chính thức khác (bổ nhiệm "Quyền" vẫn được)
        var headLevelCode = orgUnit.HeadLevelCode ?? orgUnit.Type.HeadLevelCode;
        if (request.NewLevelCode == headLevelCode && orgUnit.Type.SingleHead && !request.IsActing
            && await assignmentRepository.HasOtherHolderAsync(
                orgUnit.Id, request.NewLevelCode, employee.Id, officialOnly: true, cancellationToken))
        {
            throw new BusinessException("Đơn vị đã có người giữ chức trưởng, cần cho thôi chức người cũ trước.");
        }

        // Mỗi Tổ chỉ 1 Kỹ sư phụ trách
        if (request.NewLevelCode == PositionLevelCodes.Engineer && orgUnit.TypeCode == OrgUnitTypeCodes.Group
            && await assignmentRepository.HasOtherHolderAsync(
                orgUnit.Id, request.NewLevelCode, employee.Id, officialOnly: false, cancellationToken))
        {
            throw new BusinessException("Tổ này đã có Kỹ sư phụ trách, cần chuyển Kỹ sư cũ đi trước.");
        }

        var currentPrimaries = await assignmentRepository.GetOpenAssignmentsAsync(
            employee.Id, primaryOnly: true, cancellationToken);
        var latestStart = currentPrimaries.Count == 0 ? (DateOnly?)null : currentPrimaries.Max(x => x.StartDate);
        if (latestStart is { } startDate && request.EffectiveDate <= startDate)
        {
            throw FieldError("effectiveDate",
                $"Ngày hiệu lực phải sau ngày bắt đầu vị trí hiện tại ({startDate:dd/MM/yyyy}).");
        }

        await unitOfWork.ExecuteInTransactionAsync(_ =>
        {
            foreach (var current in currentPrimaries)
            {
                current.EndDate = request.EffectiveDate.AddDays(-1);
            }

            assignmentRepository.Add(new EmployeeAssignment
            {
                EmployeeId = employee.Id,
                OrgUnitId = orgUnit.Id,
                LevelCode = request.NewLevelCode,
                JobTitle = request.JobTitle,
                IsPrimary = true,
                IsActing = request.IsActing,
                StartDate = request.EffectiveDate,
                ChangeType = request.ChangeType,
                DecisionNo = request.DecisionNo,
                Note = request.Note,
                CreatedAt = DateTime.UtcNow,
            });

            return Task.CompletedTask;
        }, cancellationToken);
    }

    public async Task EndAsync(int assignmentId, EndAssignmentRequest request, CancellationToken cancellationToken)
    {
        request.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        AssignmentRequestValidator.Validate(request);

        var assignment = await assignmentRepository.FindByIdAsync(assignmentId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy vị trí.");

        if (assignment.EndDate is not null)
        {
            throw new BusinessException("Vị trí này đã kết thúc trước đó.");
        }

        if (request.EndDate < assignment.StartDate)
        {
            throw FieldError("endDate", "Ngày kết thúc không được trước ngày bắt đầu.");
        }

        assignment.EndDate = request.EndDate;
        if (request.Note is not null)
        {
            assignment.Note = request.Note;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AssignmentHistoryDto>> GetHistoryAsync(
        string empCode, CancellationToken cancellationToken)
    {
        var history = await assignmentRepository.GetHistoryAsync(empCode.Trim(), cancellationToken);

        return history.Select(x => new AssignmentHistoryDto
        {
            AssignmentId = x.AssignmentId,
            StartDate = x.StartDate,
            EndDate = x.EndDate,
            ChangeType = x.ChangeType,
            DecisionNo = x.DecisionNo,
            OrgUnitCode = x.OrgUnitCode,
            OrgUnitName = x.OrgUnitName,
            LevelName = x.LevelName,
            JobTitle = x.JobTitle,
            IsActing = x.IsActing,
            IsPrimary = x.IsPrimary,
        }).ToList();
    }

    public async Task EndAllActiveAsync(int employeeId, DateOnly endDate, CancellationToken cancellationToken)
    {
        var openAssignments = await assignmentRepository.GetOpenAssignmentsAsync(
            employeeId, primaryOnly: false, cancellationToken);

        foreach (var assignment in openAssignments)
        {
            assignment.EndDate = endDate < assignment.StartDate ? assignment.StartDate : endDate;
        }
    }

    public async Task<string?> GetTopLevelUnitNameAsync(int employeeId, CancellationToken cancellationToken) =>
        (await GetTopLevelUnitAsync(employeeId, cancellationToken))?.Name;

    public async Task<(int Id, string Name)?> GetTopLevelUnitAsync(int employeeId, CancellationToken cancellationToken)
    {
        var primary = (await assignmentRepository.GetOpenAssignmentsAsync(employeeId, primaryOnly: true, cancellationToken))
            .OrderByDescending(x => x.StartDate)
            .FirstOrDefault();
        if (primary is null)
        {
            return null;
        }

        var units = await assignmentRepository.GetUnitTreeAsync(cancellationToken);
        if (!units.TryGetValue(primary.OrgUnitId, out var current))
        {
            return null;
        }

        // Đi ngược lên tới đơn vị có cha là gốc (Nhà máy)
        var currentId = primary.OrgUnitId;
        var visited = new HashSet<int> { currentId };
        while (current.ParentId is { } parentId
               && units.TryGetValue(parentId, out var parent)
               && parent.ParentId is not null
               && visited.Add(parentId))
        {
            current = parent;
            currentId = parentId;
        }

        return (currentId, current.Name);
    }

    private static void Normalize(ChangeAssignmentRequest request)
    {
        request.EmpCode = request.EmpCode?.Trim() ?? string.Empty;
        request.NewOrgUnitCode = request.NewOrgUnitCode?.Trim() ?? string.Empty;
        request.NewLevelCode = request.NewLevelCode?.Trim().ToUpperInvariant() ?? string.Empty;
        request.ChangeType = request.ChangeType?.Trim().ToUpperInvariant() ?? string.Empty;
        request.JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? null : request.JobTitle.Trim();
        request.DecisionNo = string.IsNullOrWhiteSpace(request.DecisionNo) ? null : request.DecisionNo.Trim();
        request.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

        if (request.ChangeType == AssignmentChangeTypes.Acting)
        {
            request.IsActing = true;
        }
    }

    private static ValidationException FieldError(string field, string message) =>
        new("Dữ liệu không hợp lệ.", new Dictionary<string, string[]> { [field] = [message] });
}
