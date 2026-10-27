using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Employees.Entities;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;

namespace Server.Modules.Organization.Repositories;

public class AssignmentRepository(AppDbContext dbContext) : IAssignmentRepository
{
    private DbSet<EmployeeAssignment> Assignments => dbContext.Set<EmployeeAssignment>();

    public Task<EmployeeAssignment?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Assignments.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<Employee?> GetEmployeeByCodeAsync(string empCode, CancellationToken cancellationToken) =>
        dbContext.Set<Employee>().AsNoTracking().FirstOrDefaultAsync(x => x.EmpCode == empCode, cancellationToken);

    public Task<OrgUnit?> GetActiveUnitByCodeAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Set<OrgUnit>().AsNoTracking()
            .Include(x => x.Type)
            .FirstOrDefaultAsync(x => x.Code == code && x.IsActive, cancellationToken);

    public Task<bool> IsLevelActiveAsync(string levelCode, CancellationToken cancellationToken) =>
        dbContext.Set<PositionLevel>().AnyAsync(x => x.Code == levelCode && x.IsActive, cancellationToken);

    public Task<bool> HasOtherHolderAsync(
        int orgUnitId, string levelCode, int employeeId, bool officialOnly, CancellationToken cancellationToken) =>
        Assignments.AnyAsync(
            x => x.OrgUnitId == orgUnitId
                 && x.LevelCode == levelCode
                 && x.EndDate == null
                 && x.EmployeeId != employeeId
                 && (!officialOnly || !x.IsActing),
            cancellationToken);

    public async Task<IReadOnlyList<EmployeeAssignment>> GetOpenAssignmentsAsync(
        int employeeId, bool primaryOnly, CancellationToken cancellationToken) =>
        await Assignments
            .Where(x => x.EmployeeId == employeeId && x.EndDate == null && (!primaryOnly || x.IsPrimary))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<VAssignmentHistory>> GetHistoryAsync(
        string empCode, CancellationToken cancellationToken) =>
        await dbContext.Set<VAssignmentHistory>().AsNoTracking()
            .Where(x => x.EmpCode == empCode)
            .OrderByDescending(x => x.StartDate)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<VUnitMember>> GetCurrentByEmployeeIdsAsync(
        IReadOnlyCollection<int> employeeIds, CancellationToken cancellationToken) =>
        await dbContext.Set<VUnitMember>().AsNoTracking()
            .Where(x => employeeIds.Contains(x.EmployeeId))
            .OrderByDescending(x => x.IsPrimary).ThenByDescending(x => x.StartDate)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<int>> GetEmployeeIdsInUnitsAsync(
        IReadOnlyCollection<int> orgUnitIds, CancellationToken cancellationToken) =>
        await dbContext.Set<VUnitMember>().AsNoTracking()
            .Where(x => orgUnitIds.Contains(x.OrgUnitId))
            .Select(x => x.EmployeeId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<Dictionary<int, (int? ParentId, string Name)>> GetUnitTreeAsync(
        CancellationToken cancellationToken) =>
        (await dbContext.Set<OrgUnit>().AsNoTracking()
            .Select(x => new { x.Id, x.ParentId, x.Name })
            .ToListAsync(cancellationToken))
            .ToDictionary(x => x.Id, x => (x.ParentId, x.Name));

    public void Add(EmployeeAssignment assignment) => Assignments.Add(assignment);
}
