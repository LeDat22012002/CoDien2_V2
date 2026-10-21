using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Incidents.DTOs;
using Server.Modules.Incidents.Entities;
using Server.Modules.Incidents.Repositories.Interfaces;

namespace Server.Modules.Incidents.Repositories;

/// <summary>Toàn bộ thống kê group/count dưới SQL, không kéo dữ liệu thô về RAM.</summary>
public class IncidentDashboardRepository(AppDbContext dbContext) : IIncidentDashboardRepository
{
    public async Task<IReadOnlyList<GroupStatisticDto>> CountByGroupAsync(
        int year, int? workshopId, Expression<Func<Incident, string>> key, CancellationToken cancellationToken) =>
        await InYear(year, workshopId)
            .GroupBy(key)
            .Select(g => new GroupStatisticDto { Name = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

    public Task<int> CountAffectsProductionAsync(int year, int? workshopId, CancellationToken cancellationToken) =>
        InYear(year, workshopId).CountAsync(x => x.AffectsProduction, cancellationToken);

    public async Task<IReadOnlyList<WorkshopCountRow>> CountByWorkshopAsync(
        int year, int? workshopId, DateTime now, CancellationToken cancellationToken)
    {
        var analysisThreshold = IncidentRules.GetOverdueThreshold(now, IncidentRules.AnalysisDueDays);
        var supplementThreshold = IncidentRules.GetOverdueThreshold(now, IncidentRules.SupplementDueDays);

        return await InYear(year, workshopId)
            .Select(x => new
            {
                x.WorkshopId,
                IsAnalysisOverdue = x.ReportedAt <= analysisThreshold
                                    && (string.IsNullOrWhiteSpace(x.Cause)
                                        || string.IsNullOrWhiteSpace(x.RootCause)
                                        || string.IsNullOrWhiteSpace(x.CorrectiveAction)),
                IsSupplementOverdue = x.AffectsProduction
                                      && x.ReportedAt <= supplementThreshold
                                      && (string.IsNullOrWhiteSpace(x.OrderNumber)
                                          || string.IsNullOrWhiteSpace(x.ReportLink)),
            })
            .GroupBy(x => x.WorkshopId)
            .Select(g => new WorkshopCountRow
            {
                WorkshopId = g.Key,
                Count = g.Count(),
                AnalysisOverdueCount = g.Sum(x => x.IsAnalysisOverdue ? 1 : 0),
                SupplementOverdueCount = g.Sum(x => x.IsSupplementOverdue ? 1 : 0),
                OverdueCount = g.Sum(x => x.IsAnalysisOverdue || x.IsSupplementOverdue ? 1 : 0),
            })
            .ToListAsync(cancellationToken);
    }

    public Task<List<RepeatedEquipmentDto>> GetRepeatedEquipmentAsync(
        int year, int? workshopId, int threshold, CancellationToken cancellationToken) =>
        InYear(year, workshopId)
            .GroupBy(x => x.EquipmentCode)
            .Where(g => g.Count() > threshold)
            .Select(g => new RepeatedEquipmentDto
            {
                EquipmentCode = g.Key,
                EquipmentName = g.Max(x => x.EquipmentName),
                DeviceName = g.Max(x => x.DeviceName),
                WorkshopId = g.Max(x => x.WorkshopId),
                Count = g.Count(),
                LastReportedAt = g.Max(x => x.ReportedAt),
            })
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.EquipmentCode)
            .ToListAsync(cancellationToken);

    public Task<int> CountRepeatedEquipmentAsync(
        int year, int? workshopId, int threshold, CancellationToken cancellationToken) =>
        InYear(year, workshopId)
            .GroupBy(x => x.EquipmentCode)
            .Where(g => g.Count() > threshold)
            .CountAsync(cancellationToken);

    /// <summary>Báo cáo có ReportedAt thuộc năm; dữ liệu import Excel (ReportedAt null) không nằm trong thống kê.</summary>
    private IQueryable<Incident> InYear(int year, int? workshopId)
    {
        var from = new DateTime(year, 1, 1);
        var to = from.AddYears(1);

        var query = dbContext.Set<Incident>().AsNoTracking()
            .Where(x => x.ReportedAt >= from && x.ReportedAt < to);

        return workshopId is { } id ? query.Where(x => x.WorkshopId == id) : query;
    }
}
