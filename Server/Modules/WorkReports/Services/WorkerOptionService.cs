using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

public class WorkerOptionService(
    IWorkReportUnitRepository unitRepository,
    IWorkReportScopeService scopeService,
    IOrgTreeProvider orgTreeProvider,
    IAssignmentService assignmentService) : IWorkerOptionService
{
    private const int MaxWorkerOptions = 500;

    public async Task<IReadOnlyList<WorkerOptionDto>> GetWorkerOptionsAsync(
        WorkerOptionFilterRequest filter, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.GetByIdAsync(filter.UnitId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy đơn vị báo cáo.");
        var access = await scopeService.GetUnitAccessAsync(unit, cancellationToken);
        if (!access.CanView)
        {
            throw new ForbiddenException("Bạn không có quyền xem đơn vị báo cáo này.");
        }

        var scope = string.IsNullOrWhiteSpace(filter.Scope) ? WorkerOptionScopes.Unit : filter.Scope.Trim().ToUpperInvariant();
        if (!WorkerOptionScopes.All.Contains(scope))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["scope"] = ["Phạm vi phải là UNIT, TEAM hoặc WORKSHOP."],
            });
        }

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var root = scope switch
        {
            WorkerOptionScopes.Team => tree.GetTeam(unit.OrgUnitId) ?? tree.Get(tree.Get(unit.OrgUnitId)?.ParentId ?? 0),
            WorkerOptionScopes.Workshop => tree.GetWorkshop(unit.OrgUnitId),
            _ => tree.Get(unit.OrgUnitId),
        } ?? tree.Get(unit.OrgUnitId);

        var orgUnitIds = new List<int>();
        if (root is not null)
        {
            orgUnitIds.Add(root.Id);
            orgUnitIds.AddRange(tree.GetDescendants(root.Id).Select(x => x.Id));
        }

        var members = await assignmentService.GetUnitMembersAsync(orgUnitIds, cancellationToken);
        var keyword = TextNormalizer.ToKey(filter.Keyword);
        var ownUnitIds = new HashSet<int>(tree.GetDescendants(unit.OrgUnitId).Select(x => x.Id)) { unit.OrgUnitId };

        return members
            .Where(x => keyword.Length == 0
                        || TextNormalizer.ToKey(x.FullName).Contains(keyword)
                        || TextNormalizer.ToKey(x.EmpCode).Contains(keyword))
            .OrderBy(x => ownUnitIds.Contains(x.OrgUnitId) ? 0 : 1)
            .ThenBy(x => x.IsPrimary ? 0 : 1)
            .ThenBy(x => x.FullName)
            .DistinctBy(x => x.EmployeeId)
            .Take(MaxWorkerOptions)
            .Select(x => new WorkerOptionDto
            {
                EmployeeId = x.EmployeeId,
                EmpCode = x.EmpCode,
                FullName = x.FullName,
                OrgUnitName = x.OrgUnitName,
                LevelName = x.LevelName,
            })
            .ToList();
    }
}
