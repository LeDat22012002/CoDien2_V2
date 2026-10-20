using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Employees.DTOs;
using Server.Modules.Employees.Entities;
using Server.Modules.Employees.Repositories.Interfaces;

namespace Server.Modules.Employees.Repositories;

public class EmployeeRepository(AppDbContext dbContext) : IEmployeeRepository
{
    private DbSet<Employee> Employees => dbContext.Set<Employee>();

    public async Task<(IReadOnlyList<Employee> Items, int TotalCount)> GetPagedAsync(
        EmployeeFilterRequest filter, CancellationToken cancellationToken)
    {
        var query = Employees.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();
            query = query.Where(x =>
                x.EmpCode.Contains(keyword) ||
                x.FullName.Contains(keyword) ||
                (x.Email != null && x.Email.Contains(keyword)) ||
                (x.Phone != null && x.Phone.Contains(keyword)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(x => x.Status == filter.Status);
        }

        if (!string.IsNullOrWhiteSpace(filter.Gender))
        {
            query = query.Where(x => x.Gender == filter.Gender);
        }

        if (!string.IsNullOrWhiteSpace(filter.EducationLevel))
        {
            query = query.Where(x => x.EducationLevel == filter.EducationLevel);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.EmpCode)
            .Skip((filter.PageIndex - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<Employee?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<Employee?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Employees.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> IsEmpCodeTakenAsync(string empCode, int? excludeId, CancellationToken cancellationToken) =>
        Employees.AnyAsync(x => x.EmpCode == empCode && (excludeId == null || x.Id != excludeId), cancellationToken);

    public Task<bool> HasAssignmentsAsync(int employeeId, CancellationToken cancellationToken) =>
        // EmployeeAssignment chưa có module/entity riêng nên tạm truy vấn SQL trực tiếp
        dbContext.Database
            .SqlQuery<int>($"SELECT 1 AS [Value] FROM dbo.EmployeeAssignment WHERE EmployeeId = {employeeId}")
            .AnyAsync(cancellationToken);

    public void Add(Employee employee) => Employees.Add(employee);

    public void Remove(Employee employee) => Employees.Remove(employee);
}
