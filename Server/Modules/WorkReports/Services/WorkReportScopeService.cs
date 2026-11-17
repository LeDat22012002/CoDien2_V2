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
        Task<bool> Has(string code) => permissionChecker.HasPermissionAsync(userId, code, cancellationToken);

        var canConfigure = await Has(PermissionCodes.WorkReports.Configure);
        var canSubmit = await Has(PermissionCodes.WorkReports.Submit);
        var canManage = await Has(PermissionCodes.WorkReports.Manage);
        var canAssignEngineers = await Has(PermissionCodes.WorkReports.AssignEngineers);
        var canUnlock = await Has(PermissionCodes.WorkReports.Unlock);
        var planRights = new PhaseRights(
            await Has(PermissionCodes.WorkReports.PlanCreate),
            await Has(PermissionCodes.WorkReports.PlanUpdate),
            await Has(PermissionCodes.WorkReports.PlanDelete));
        var reportRights = new PhaseRights(
            await Has(PermissionCodes.WorkReports.ReportCreate),
            await Has(PermissionCodes.WorkReports.ReportUpdate),
            await Has(PermissionCodes.WorkReports.ReportDelete));

        var employeeId = await employeeService.GetCurrentEmployeeIdAsync(cancellationToken);
        var engineerUnitIds = new HashSet<int>();
        var headTeamIds = new HashSet<int>();
        var headWorkshopIds = new HashSet<int>();

        // Mã quyền quyết định vai trò; phân công / sơ đồ tổ chức quyết định tổ, đội, xưởng nào
        if (employeeId is { } id && canSubmit)
        {
            engineerUnitIds.UnionWith(await unitRepository.GetUnitIdsOfEngineerAsync(id, Today, cancellationToken));
        }

        // Chức vụ trên sơ đồ chỉ có tác dụng khi có ít nhất 1 quyền dùng theo chức vụ
        var usesHeadPositions = canManage || canAssignEngineers || canUnlock || planRights.Any || reportRights.Any;
        if (employeeId is { } managerId && usesHeadPositions)
        {
            var tree = await orgTreeProvider.GetAsync(cancellationToken);
            var positions = await assignmentService.GetCurrentAssignmentsAsync([managerId], cancellationToken);
            foreach (var position in positions.Where(x => x.UnitRole is UnitRoles.Head or UnitRoles.Deputy))
            {
                var unit = tree.Get(position.OrgUnitId);
                if (unit is null || unit.ParentId is null)
                {
                    // Trưởng/phó Nhà máy (Ban Giám đốc) xem toàn nhà máy ở trang công khai /work-reports
                    continue;
                }

                if (tree.GetWorkshop(unit.Id)?.Id == unit.Id)
                {
                    // Trưởng/phó đơn vị cấp 1 (quản đốc/phó; đội trưởng của đội trực thuộc Nhà máy): cả đơn vị
                    headWorkshopIds.Add(unit.Id);
                }
                else if (unit.TypeCode == OrgUnitTypeCodes.Team)
                {
                    headTeamIds.Add(unit.Id);
                }
            }
        }

        return _scope = new WorkReportScope
        {
            EmployeeId = employeeId,
            CanConfigure = canConfigure,
            CanManage = canManage,
            CanAssignEngineers = canAssignEngineers,
            CanUnlock = canUnlock,
            EngineerUnitIds = engineerUnitIds,
            HeadTeamIds = headTeamIds,
            HeadWorkshopIds = headWorkshopIds,
            PlanRights = planRights,
            ReportRights = reportRights,
        };
    }

    public void UsePublicView() => _scope = new WorkReportScope { CanViewFactory = true };

    public Task<WorkReportUnitAccessDto> GetUnitAccessAsync(WorkReportUnit unit, CancellationToken cancellationToken) =>
        GetUnitAccessAsync(unit, null, cancellationToken);

    public async Task<WorkReportUnitAccessDto> GetUnitAccessAsync(
        WorkReportUnit unit, int? workshopId, CancellationToken cancellationToken)
    {
        var scope = await GetScopeAsync(cancellationToken);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        return ComputeAccess(scope, tree, unit, workshopId);
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

    /// <param name="formWorkshopId">Xưởng đã chụp trong form (tổ đã chuyển xưởng thì tuần cũ thuộc quản đốc xưởng cũ).</param>
    private static WorkReportUnitAccessDto ComputeAccess(
        WorkReportScope scope, OrgTree tree, WorkReportUnit unit, int? formWorkshopId = null)
    {
        var orgUnit = tree.Get(unit.OrgUnitId);
        var isShift = orgUnit?.TypeCode == OrgUnitTypeCodes.Shift;
        var workshopId = formWorkshopId ?? tree.GetWorkshop(unit.OrgUnitId)?.Id;

        var isAdmin = scope.CanConfigure;
        var isWorkshopHead = workshopId is { } wsId && scope.HeadWorkshopIds.Contains(wsId);
        // Đơn vị tự đặt gắn trực tiếp với đội: OrgUnitId chính là đội
        var isTeamHead = scope.HeadTeamIds.Contains(unit.OrgUnitId)
                         || tree.GetAncestors(unit.OrgUnitId).Any(x => scope.HeadTeamIds.Contains(x.Id));
        var isEngineer = scope.EngineerUnitIds.Contains(unit.Id);
        var isWorkshopManager = scope.CanManage && isWorkshopHead;
        var isTeamManager = scope.CanManage && isTeamHead;

        // Kỹ sư phụ trách: mặc định đủ quyền; người khác: quyền admin cấp, trong đội/xưởng mình là trưởng/phó (admin: mọi xưởng)
        var inHeadScope = isAdmin || isWorkshopHead || isTeamHead;
        var plan = RightsOf(isEngineer, inHeadScope, scope.PlanRights);
        var report = RightsOf(isEngineer, inHeadScope, scope.ReportRights);
        var canUnlock = scope.CanUnlock && inHeadScope;
        // Kíp: chỉ quản đốc/phó phân công kỹ sư; tổ HC: thêm đội trưởng/phó của đội chứa tổ
        var canAssignEngineers = scope.CanAssignEngineers && (isAdmin || isWorkshopHead || (isTeamHead && !isShift));
        var hasGrantedRight = plan.Any || report.Any || canUnlock || canAssignEngineers;

        var role = isWorkshopHead && (isWorkshopManager || hasGrantedRight) ? WorkReportRoles.WorkshopManager
            : isTeamHead && (isTeamManager || hasGrantedRight) ? WorkReportRoles.TeamManager
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
            CanView = isAdmin || scope.CanViewFactory || isWorkshopManager || isTeamManager || isEngineer
                      || hasGrantedRight,
            Plan = plan,
            Report = report,
            CanUnlock = canUnlock,
            CanManageEngineers = canAssignEngineers,
            CanConfigure = isAdmin || isWorkshopManager,
        };
    }

    private static WorkReportRightsDto RightsOf(bool isEngineer, bool inHeadScope, PhaseRights granted)
    {
        var rights = isEngineer ? PhaseRights.All : inHeadScope ? granted : PhaseRights.None;
        return new WorkReportRightsDto { CanCreate = rights.Create, CanUpdate = rights.Update, CanDelete = rights.Delete };
    }

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);
}