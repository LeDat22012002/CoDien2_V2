using Server.Modules.Employees.Services.Interfaces;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Exceptions;
using Server.Shared.Services;

namespace Server.Modules.WorkReports.Services;

public class WorkReportScopeService(
    IEmployeeService employeeService,
    IAssignmentService assignmentService,
    IPermissionChecker permissionChecker,
    ICurrentUserService currentUserService,
    IWorkReportUnitRepository unitRepository,
    IOrgTreeProvider orgTreeProvider) : IWorkReportScopeService
{
    private const string InvalidSessionMessage = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.";

    private WorkReportScope? _scope;

    public async Task<WorkReportScope> GetScopeAsync(CancellationToken cancellationToken)
    {
        if (_scope is not null)
        {
            return _scope;
        }

        var userId = currentUserService.UserId ?? throw new UnauthorizedException(InvalidSessionMessage);
        var canConfigure = await permissionChecker.HasPermissionAsync(
            userId, PermissionCodes.WorkReports.Configure, cancellationToken);
        var canViewFactory = await permissionChecker.HasPermissionAsync(
            userId, PermissionCodes.WorkReports.ViewFactory, cancellationToken);

        var employeeId = await employeeService.GetCurrentEmployeeIdAsync(cancellationToken);
        var engineerUnitIds = new HashSet<int>();
        var managedTeamIds = new HashSet<int>();
        var managedWorkshopIds = new HashSet<int>();

        if (employeeId is { } id)
        {
            engineerUnitIds.UnionWith(await unitRepository.GetUnitIdsOfEngineerAsync(id, Today, cancellationToken));

            var tree = await orgTreeProvider.GetAsync(cancellationToken);
            var positions = await assignmentService.GetCurrentAssignmentsAsync([id], cancellationToken);
            foreach (var position in positions.Where(x => x.UnitRole is UnitRoles.Head or UnitRoles.Deputy))
            {
                var unit = tree.Get(position.OrgUnitId);
                if (unit is null)
                {
                    continue;
                }

                if (unit.ParentId is null)
                {
                    // Trưởng/phó Nhà máy (Ban Giám đốc) xem được mọi xưởng
                    canViewFactory = true;
                }
                else if (tree.GetWorkshop(unit.Id)?.Id == unit.Id)
                {
                    // Trưởng/phó đơn vị cấp 1 (quản đốc/phó; đội trưởng của đội trực thuộc Nhà máy) quản lý cả đơn vị
                    managedWorkshopIds.Add(unit.Id);
                }
                else if (unit.TypeCode == OrgUnitTypeCodes.Team)
                {
                    managedTeamIds.Add(unit.Id);
                }
            }
        }

        return _scope = new WorkReportScope
        {
            EmployeeId = employeeId,
            CanConfigure = canConfigure,
            CanViewFactory = canViewFactory,
            EngineerUnitIds = engineerUnitIds,
            ManagedTeamIds = managedTeamIds,
            ManagedWorkshopIds = managedWorkshopIds,
        };
    }

    public async Task<WorkReportUnitAccessDto> GetUnitAccessAsync(WorkReportUnit unit, CancellationToken cancellationToken)
    {
        var scope = await GetScopeAsync(cancellationToken);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        return ComputeAccess(scope, tree, unit);
    }

    public async Task<bool> CanManageWorkshopAsync(int workshopId, CancellationToken cancellationToken)
    {
        var scope = await GetScopeAsync(cancellationToken);
        return scope.CanConfigure || scope.ManagedWorkshopIds.Contains(workshopId);
    }

    public async Task<MyWorkReportScopeDto> GetMyScopeAsync(CancellationToken cancellationToken)
    {
        var scope = await GetScopeAsync(cancellationToken);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var units = await unitRepository.GetListAsync(includeInactive: false, cancellationToken);

        var unitsByWorkshop = units
            .GroupBy(x => tree.GetWorkshop(x.OrgUnitId)?.Id ?? 0)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.SortOrder).ThenBy(x => x.Id).ToList());

        var workshops = new List<WorkReportScopeWorkshopDto>();
        foreach (var workshop in tree.GetWorkshops())
        {
            var accesses = unitsByWorkshop.GetValueOrDefault(workshop.Id, [])
                .Select(x => ComputeAccess(scope, tree, x))
                .Where(x => x.CanView)
                .ToList();
            var isManager = scope.CanConfigure || scope.ManagedWorkshopIds.Contains(workshop.Id);

            if (isManager || scope.CanViewFactory || accesses.Count > 0)
            {
                workshops.Add(new WorkReportScopeWorkshopDto
                {
                    WorkshopId = workshop.Id,
                    WorkshopName = workshop.Name,
                    IsManager = isManager,
                    Units = accesses,
                });
            }
        }

        return new MyWorkReportScopeDto
        {
            EmployeeId = scope.EmployeeId,
            CanConfigure = scope.CanConfigure,
            CanViewFactory = scope.CanViewFactory,
            Workshops = workshops,
        };
    }

    private static WorkReportUnitAccessDto ComputeAccess(WorkReportScope scope, OrgTree tree, WorkReportUnit unit)
    {
        var orgUnit = tree.Get(unit.OrgUnitId);
        var isShift = orgUnit?.TypeCode == OrgUnitTypeCodes.Shift;
        var workshopId = tree.GetWorkshop(unit.OrgUnitId)?.Id;

        var isAdmin = scope.CanConfigure;
        var isWorkshopManager = workshopId is { } wsId && scope.ManagedWorkshopIds.Contains(wsId);
        var isTeamManager = tree.GetAncestors(unit.OrgUnitId).Any(x => scope.ManagedTeamIds.Contains(x.Id));
        var isEngineer = scope.EngineerUnitIds.Contains(unit.Id);

        var role = isWorkshopManager ? WorkReportRoles.WorkshopManager
            : isTeamManager ? WorkReportRoles.TeamManager
            : isEngineer ? WorkReportRoles.Engineer
            : isAdmin ? WorkReportRoles.Admin
            : scope.CanViewFactory ? WorkReportRoles.Viewer
            : WorkReportRoles.None;

        return new WorkReportUnitAccessDto
        {
            UnitId = unit.Id,
            OrgUnitId = unit.OrgUnitId,
            DisplayName = unit.DisplayName,
            LaborType = unit.LaborType,
            SortOrder = unit.SortOrder,
            Role = role,
            CanView = isAdmin || scope.CanViewFactory || isWorkshopManager || isTeamManager || isEngineer,
            CanEdit = isWorkshopManager || isTeamManager || isEngineer,
            CanEditLocked = isWorkshopManager,
            CanRequestRevision = isWorkshopManager || isTeamManager,
            CanUnlock = isAdmin || isWorkshopManager,

            // Kíp: chỉ quản đốc/phó xác nhận kỹ sư; tổ HC: thêm đội trưởng/phó của đội chứa tổ
            CanManageEngineers = isAdmin || isWorkshopManager || (isTeamManager && !isShift),
            CanConfigure = isAdmin || isWorkshopManager,
        };
    }

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);
}