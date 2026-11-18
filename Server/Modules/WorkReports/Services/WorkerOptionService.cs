using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
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
    private const string UnitNotFoundMessage = "Không tìm thấy đơn vị báo cáo.";

    public async Task<IReadOnlyList<WorkerOptionDto>> GetWorkerOptionsAsync(
        WorkerOptionFilterRequest filter, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.GetByIdAsync(filter.UnitId, cancellationToken)
            ?? throw new NotFoundException(UnitNotFoundMessage);
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

        return await GetMembersAsync(unit, scope, filter.Keyword, cancellationToken);
    }

    public async Task<IReadOnlyList<WorkerOptionDto>> GetUnitMembersAsync(int unitId, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.GetByIdAsync(unitId, cancellationToken)
            ?? throw new NotFoundException(UnitNotFoundMessage);
        return await GetMembersAsync(unit, WorkerOptionScopes.Unit, null, cancellationToken);
    }

    private async Task<IReadOnlyList<WorkerOptionDto>> GetMembersAsync(
        WorkReportUnit unit, string scope, string? rawKeyword, CancellationToken cancellationToken)
    {
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var root = scope switch
        {
            WorkerOptionScopes.Team => tree.GetTeam(unit.OrgUnitId) ?? tree.Get(tree.Get(unit.OrgUnitId)?.ParentId ?? 0),
            WorkerOptionScopes.Workshop => tree.GetWorkshop(unit.OrgUnitId),
            _ => tree.Get(unit.OrgUnitId),
        } ?? tree.Get(unit.OrgUnitId);

        // Đơn vị tự đặt gộp tổ: "của tổ" = nhân viên các tổ gộp (không lấy cả đội/xưởng gắn)
        var ownRootIds = unit.MemberOrgUnitIds.Count > 0 ? unit.MemberOrgUnitIds : [unit.OrgUnitId];
        var ownUnitIds = ownRootIds
            .SelectMany(id => tree.GetDescendants(id).Select(x => x.Id).Prepend(id))
            .ToHashSet();

        var orgUnitIds = new List<int>();
        if (scope == WorkerOptionScopes.Unit)
        {
            orgUnitIds.AddRange(ownUnitIds);
        }
        else if (root is not null)
        {
            orgUnitIds.Add(root.Id);
            orgUnitIds.AddRange(tree.GetDescendants(root.Id).Select(x => x.Id));
        }

        var members = await assignmentService.GetUnitMembersAsync(orgUnitIds, cancellationToken);
        var keyword = TextNormalizer.ToKey(rawKeyword);

        // Đơn vị có tổ gợi ý: đơn vị trên sơ đồ (tổ hoặc con cháu) → tổ gợi ý chứa nó, để Client chia nhóm theo tổ
        var groupOf = new Dictionary<int, OrgUnitDto>();
        foreach (var groupId in unit.MemberOrgUnitIds)
        {
            if (tree.Get(groupId) is not { } group)
            {
                continue;
            }

            foreach (var id in tree.GetDescendants(groupId).Select(x => x.Id).Prepend(groupId))
            {
                groupOf.TryAdd(id, group);
            }
        }

        var groupOrder = unit.MemberOrgUnitIds.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);

        return members
            .Where(x => keyword.Length == 0
                        || TextNormalizer.ToKey(x.FullName).Contains(keyword)
                        || TextNormalizer.ToKey(x.EmpCode).Contains(keyword))
            .OrderBy(x => ownUnitIds.Contains(x.OrgUnitId) ? 0 : 1)
            .ThenBy(x => groupOf.TryGetValue(x.OrgUnitId, out var group) ? groupOrder[group.Id] : int.MaxValue)
            .ThenBy(x => x.IsPrimary ? 0 : 1)
            .ThenBy(x => x.FullName)
            .DistinctBy(x => x.EmployeeId)
            .Take(MaxWorkerOptions)
            .Select(x =>
            {
                var group = groupOf.GetValueOrDefault(x.OrgUnitId);
                return new WorkerOptionDto
                {
                    EmployeeId = x.EmployeeId,
                    EmpCode = x.EmpCode,
                    FullName = x.FullName,
                    OrgUnitName = x.OrgUnitName,
                    LevelName = x.LevelName,
                    GroupOrgUnitId = group?.Id,
                    GroupName = group?.Name,
                };
            })
            .ToList();
    }

    public async Task<(IReadOnlyList<WorkerOptionDto> Members, IReadOnlyList<OrgUnitOptionDto> Groups)> GetGroupMembersAsync(
        int unitId, IReadOnlyCollection<int> groupOrgUnitIds, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.GetByIdAsync(unitId, cancellationToken)
            ?? throw new NotFoundException(UnitNotFoundMessage);
        var ids = groupOrgUnitIds.Distinct().ToList();
        if (ids.Any(x => !unit.MemberOrgUnitIds.Contains(x)))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["workers"] = ["\"Cả tổ\" chỉ chọn được các tổ gợi ý của đơn vị này. Hãy tải lại bảng rồi chọn lại."],
            });
        }

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var members = (await GetMembersAsync(unit, WorkerOptionScopes.Unit, null, cancellationToken))
            .Where(x => x.GroupOrgUnitId is { } groupId && ids.Contains(groupId))
            .ToList();
        var groups = unit.MemberOrgUnitIds
            .Where(ids.Contains)
            .Select(x => new OrgUnitOptionDto { OrgUnitId = x, Name = tree.GetName(x) })
            .ToList();
        return (members, groups);
    }
}
