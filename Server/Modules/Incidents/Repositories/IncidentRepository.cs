using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Incidents.DTOs;
using Server.Modules.Incidents.Entities;
using Server.Modules.Employees.Entities;
using Server.Modules.Incidents.Repositories.Interfaces;
using Server.Modules.Organization.Entities;

namespace Server.Modules.Incidents.Repositories;

public class IncidentRepository(AppDbContext dbContext) : IIncidentRepository
{
    private DbSet<Incident> Incidents => dbContext.Set<Incident>();

    public async Task<(IReadOnlyList<IncidentDto> Items, int TotalCount)> GetPagedAsync(
        IncidentFilterRequest filter, string? reporterEmpCode, CancellationToken cancellationToken)
    {
        var query = Incidents.AsNoTracking();

        if (reporterEmpCode is not null)
        {
            query = query.Where(x => x.ReporterEmpCode == reporterEmpCode);
        }

        if (filter.WorkshopId is { } workshopId)
        {
            query = query.Where(x => x.WorkshopId == workshopId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Shift))
        {
            query = query.Where(x => x.Shift == filter.Shift);
        }

        if (!string.IsNullOrWhiteSpace(filter.EquipmentCode))
        {
            var equipmentCode = filter.EquipmentCode.Trim();
            query = query.Where(x => x.EquipmentCode == equipmentCode);
        }

        if (!string.IsNullOrWhiteSpace(filter.IncidentType))
        {
            query = query.Where(x => x.IncidentType == filter.IncidentType);
        }

        if (!string.IsNullOrWhiteSpace(filter.StopLevel))
        {
            query = query.Where(x => x.StopLevel == filter.StopLevel);
        }

        if (filter.AffectsProduction is { } affectsProduction)
        {
            query = query.Where(x => x.AffectsProduction == affectsProduction);
        }

        if (filter.FromDate is { } fromDate)
        {
            var from = fromDate.ToDateTime(TimeOnly.MinValue);
            query = query.Where(x => x.ReceivedAt >= from);
        }

        if (filter.ToDate is { } toDate)
        {
            var to = toDate.AddDays(1).ToDateTime(TimeOnly.MinValue);
            query = query.Where(x => x.ReceivedAt < to);
        }

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();
            query = query.Where(x => x.EquipmentCode.Contains(keyword)
                                     || x.EquipmentName.Contains(keyword)
                                     || (x.DeviceName != null && x.DeviceName.Contains(keyword))
                                     || (x.Description != null && x.Description.Contains(keyword))
                                     || (x.Solution != null && x.Solution.Contains(keyword))
                                     || (x.Note != null && x.Note.Contains(keyword)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var isDescending = !string.Equals(filter.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
        query = filter.SortBy?.ToLowerInvariant() switch
        {
            "id" => isDescending ? query.OrderByDescending(x => x.Id) : query.OrderBy(x => x.Id),
            "equipmentcode" => isDescending
                ? query.OrderByDescending(x => x.EquipmentCode) : query.OrderBy(x => x.EquipmentCode),
            "shift" => isDescending ? query.OrderByDescending(x => x.Shift) : query.OrderBy(x => x.Shift),
            "incidenttype" => isDescending
                ? query.OrderByDescending(x => x.IncidentType) : query.OrderBy(x => x.IncidentType),
            "reportedat" => isDescending
                ? query.OrderByDescending(x => x.ReportedAt) : query.OrderBy(x => x.ReportedAt),
            _ => isDescending
                ? query.OrderByDescending(x => x.ReceivedAt).ThenByDescending(x => x.Id)
                : query.OrderBy(x => x.ReceivedAt).ThenBy(x => x.Id),
        };

        var items = await ToDto(query
                .Skip((filter.PageIndex - 1) * filter.PageSize)
                .Take(filter.PageSize))
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<IncidentDto?> GetDetailAsync(int id, CancellationToken cancellationToken) =>
        ToDto(Incidents.AsNoTracking().Where(x => x.Id == id)).FirstOrDefaultAsync(cancellationToken);

    public Task<Incident?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Incidents.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> HasByEquipmentCodeAsync(string equipmentCode, CancellationToken cancellationToken) =>
        Incidents.AnyAsync(x => x.EquipmentCode == equipmentCode, cancellationToken);

    public Task<Employee?> GetEmployeeByEmpCodeAsync(string empCode, CancellationToken cancellationToken) =>
        dbContext.Set<Employee>().AsNoTracking().FirstOrDefaultAsync(x => x.EmpCode == empCode, cancellationToken);

    public void Add(Incident incident) => Incidents.Add(incident);

    public void AddRange(IEnumerable<Incident> incidents) => Incidents.AddRange(incidents);

    public void Remove(Incident incident) => Incidents.Remove(incident);

    /// <summary>Left join OrgUnit lấy tên xưởng (không có navigation vì OrgUnit là bảng có sẵn).</summary>
    private IQueryable<IncidentDto> ToDto(IQueryable<Incident> query) =>
        from x in query
        join unit in dbContext.Set<OrgUnit>() on x.WorkshopId equals (int?)unit.Id into units
        from unit in units.DefaultIfEmpty()
        select new IncidentDto
        {
            Id = x.Id,
            WorkshopId = x.WorkshopId,
            WorkshopName = unit != null ? unit.Name : null,
            Shift = x.Shift,
            EquipmentCode = x.EquipmentCode,
            EquipmentName = x.EquipmentName,
            DeviceName = x.DeviceName,
            ReceivedAt = x.ReceivedAt,
            RepairStartedAt = x.RepairStartedAt,
            RepairFinishedAt = x.RepairFinishedAt,
            HandedOverAt = x.HandedOverAt,
            IncidentType = x.IncidentType,
            StopLevel = x.StopLevel,
            AffectsProduction = x.AffectsProduction,
            Description = x.Description,
            Solution = x.Solution,
            Result = x.Result,
            Note = x.Note,
            Cause = x.Cause,
            RootCause = x.RootCause,
            CorrectiveAction = x.CorrectiveAction,
            ReportedAt = x.ReportedAt,
            ReporterEmpCode = x.ReporterEmpCode,
            ReporterName = x.ReporterName,
            OrderNumber = x.OrderNumber,
            ReportLink = x.ReportLink,
        };
}
