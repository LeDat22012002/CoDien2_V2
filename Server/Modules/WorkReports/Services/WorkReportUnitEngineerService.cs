using Server.Data;
using Server.Modules.Employees.Entities;
using Server.Modules.Employees.Services.Interfaces;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Kỹ sư phụ trách tổ/kíp (bảng riêng, không đụng vị trí trên sơ đồ tổ chức).
/// Kỹ sư trên sơ đồ chỉ là gợi ý; phải được xác nhận ở đây mới thành người nhập form.
/// </summary>
public class WorkReportUnitEngineerService(
    IWorkReportUnitRepository unitRepository,
    IWorkReportScopeService scopeService,
    IEmployeeService employeeService,
    IAssignmentService assignmentService,
    IOrgTreeProvider orgTreeProvider,
    IUnitOfWork unitOfWork) : IWorkReportUnitEngineerService
{
    private const string UnitNotFoundMessage = "Không tìm thấy đơn vị báo cáo.";

    public async Task<IReadOnlyList<WorkReportUnitEngineerDto>> GetEngineersAsync(
        int unitId, CancellationToken cancellationToken)
    {
        var unit = await GetUnitAsync(unitId, cancellationToken);
        var access = await scopeService.GetUnitAccessAsync(unit, cancellationToken);
        if (!access.CanView && !access.CanManageEngineers)
        {
            throw new ForbiddenException("Bạn không có quyền xem đơn vị báo cáo này.");
        }

        return (await GetActiveByUnitAsync([unitId], cancellationToken)).GetValueOrDefault(unitId, []);
    }

    public async Task<IReadOnlyList<WorkReportUnitEngineerDto>> SetEngineersAsync(
        int unitId, SetUnitEngineersRequest request, CancellationToken cancellationToken)
    {
        var unit = await GetUnitAsync(unitId, cancellationToken);
        await EnsureCanManageAsync(unit, cancellationToken);

        var employeeIds = (request.EmployeeIds ?? []).Where(x => x > 0).Distinct().ToList();
        await EnsureEmployeesActiveAsync(employeeIds, cancellationToken);

        var today = Today;
        var current = await unitRepository.FindActiveEngineersAsync(unitId, today, cancellationToken);

        foreach (var engineer in current.Where(x => !employeeIds.Contains(x.EmployeeId)))
        {
            if (engineer.StartDate >= today)
            {
                // Mới thêm hôm nay mà bỏ ngay: không cần giữ lịch sử
                unitRepository.RemoveEngineer(engineer);
            }
            else
            {
                engineer.EndDate = today.AddDays(-1);
            }
        }

        var currentIds = current.Select(x => x.EmployeeId).ToHashSet();
        foreach (var employeeId in employeeIds.Where(x => !currentIds.Contains(x)))
        {
            unitRepository.AddEngineer(new WorkReportUnitEngineer
            {
                WorkReportUnitId = unitId,
                EmployeeId = employeeId,
                StartDate = today,
            });
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return (await GetActiveByUnitAsync([unitId], cancellationToken)).GetValueOrDefault(unitId, []);
    }

    public async Task<IReadOnlyList<EngineerSuggestionDto>> GetSuggestionsAsync(
        int unitId, CancellationToken cancellationToken)
    {
        var unit = await GetUnitAsync(unitId, cancellationToken);
        await EnsureCanManageAsync(unit, cancellationToken);

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var orgUnitIds = new List<int> { unit.OrgUnitId };

        // Kỹ sư thường giữ vị trí ở Đội chứa tổ (hoặc đơn vị cha trực tiếp)
        if (tree.Get(unit.OrgUnitId)?.ParentId is { } parentId)
        {
            orgUnitIds.Add(parentId);
        }

        if (tree.GetTeam(unit.OrgUnitId) is { } team && !orgUnitIds.Contains(team.Id))
        {
            orgUnitIds.Add(team.Id);
        }

        var members = await assignmentService.GetUnitMembersAsync(orgUnitIds, cancellationToken);
        var assignedIds = (await unitRepository.GetActiveEngineersAsync([unitId], Today, cancellationToken))
            .Select(x => x.EmployeeId)
            .ToHashSet();

        // Ưu tiên người ở chính tổ/kíp, rồi tới đơn vị cha; mỗi người 1 dòng
        return members
            .Where(x => x.LevelCode == PositionLevelCodes.Engineer)
            .OrderBy(x => x.OrgUnitId == unit.OrgUnitId ? 0 : 1)
            .ThenBy(x => x.FullName)
            .DistinctBy(x => x.EmployeeId)
            .Select(x => new EngineerSuggestionDto
            {
                EmployeeId = x.EmployeeId,
                EmpCode = x.EmpCode,
                FullName = x.FullName,
                OrgUnitName = x.OrgUnitName,
                LevelName = x.LevelName,
                IsAssigned = assignedIds.Contains(x.EmployeeId),
            })
            .ToList();
    }

    public async Task<IReadOnlyDictionary<int, IReadOnlyList<WorkReportUnitEngineerDto>>> GetActiveByUnitAsync(
        IReadOnlyCollection<int>? unitIds, CancellationToken cancellationToken)
    {
        var engineers = await unitRepository.GetActiveEngineersAsync(unitIds, Today, cancellationToken);
        if (engineers.Count == 0)
        {
            return new Dictionary<int, IReadOnlyList<WorkReportUnitEngineerDto>>();
        }

        var employees = (await employeeService.GetBriefsAsync(
                engineers.Select(x => x.EmployeeId).Distinct().ToList(), cancellationToken))
            .ToDictionary(x => x.Id);

        return engineers
            .GroupBy(x => x.WorkReportUnitId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<WorkReportUnitEngineerDto>)g
                    .Select(x => new WorkReportUnitEngineerDto
                    {
                        Id = x.Id,
                        EmployeeId = x.EmployeeId,
                        EmpCode = employees.GetValueOrDefault(x.EmployeeId)?.EmpCode ?? string.Empty,
                        FullName = employees.GetValueOrDefault(x.EmployeeId)?.FullName ?? $"#{x.EmployeeId}",
                        StartDate = x.StartDate,
                    })
                    .ToList());
    }

    private async Task<WorkReportUnit> GetUnitAsync(int unitId, CancellationToken cancellationToken) =>
        await unitRepository.GetByIdAsync(unitId, cancellationToken) ?? throw new NotFoundException(UnitNotFoundMessage);

    private async Task EnsureCanManageAsync(WorkReportUnit unit, CancellationToken cancellationToken)
    {
        var access = await scopeService.GetUnitAccessAsync(unit, cancellationToken);
        if (access.CanManageEngineers)
        {
            return;
        }

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var isShift = tree.Get(unit.OrgUnitId)?.TypeCode == OrgUnitTypeCodes.Shift;
        throw new ForbiddenException(isShift
            ? "Chỉ quản đốc / phó quản đốc được phân công kỹ sư cho kíp."
            : "Chỉ đội trưởng / đội phó của đội hoặc quản đốc / phó quản đốc được phân công kỹ sư cho tổ.");
    }

    private async Task EnsureEmployeesActiveAsync(IReadOnlyCollection<int> employeeIds, CancellationToken cancellationToken)
    {
        if (employeeIds.Count == 0)
        {
            return;
        }

        var employees = (await employeeService.GetBriefsAsync(employeeIds, cancellationToken)).ToDictionary(x => x.Id);
        var invalid = employeeIds
            .Where(x => !employees.TryGetValue(x, out var employee) || employee.Status != EmployeeStatus.Active)
            .ToList();

        if (invalid.Count > 0)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["employeeIds"] = [$"Có {invalid.Count} người không tồn tại hoặc đã nghỉ việc."],
            });
        }
    }

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);
}