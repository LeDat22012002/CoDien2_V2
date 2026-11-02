using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;

namespace Server.Modules.Organization.Repositories;

public class OrgChartHiddenEmployeeRepository(AppDbContext dbContext) : IOrgChartHiddenEmployeeRepository
{
    public async Task<IReadOnlyList<int>> GetHiddenEmployeeIdsAsync(
        IReadOnlyCollection<int> employeeIds, CancellationToken cancellationToken) =>
        await dbContext.Set<OrgChartHiddenEmployee>().AsNoTracking()
            .Where(x => employeeIds.Contains(x.EmployeeId))
            .Select(x => x.EmployeeId)
            .ToListAsync(cancellationToken);

    public Task<OrgChartHiddenEmployee?> FindByEmployeeIdAsync(int employeeId, CancellationToken cancellationToken) =>
        dbContext.Set<OrgChartHiddenEmployee>().FirstOrDefaultAsync(x => x.EmployeeId == employeeId, cancellationToken);

    public void Add(OrgChartHiddenEmployee hiddenEmployee) => dbContext.Set<OrgChartHiddenEmployee>().Add(hiddenEmployee);

    public void Remove(OrgChartHiddenEmployee hiddenEmployee) => dbContext.Set<OrgChartHiddenEmployee>().Remove(hiddenEmployee);
}
