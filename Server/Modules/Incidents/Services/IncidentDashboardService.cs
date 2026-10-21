using Server.Modules.Incidents.DTOs;
using Server.Modules.Incidents.Entities;
using Server.Modules.Incidents.Repositories.Interfaces;
using Server.Modules.Incidents.Services.Interfaces;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.Incidents.Services;

/// <summary>
/// Dashboard báo cáo sự cố (chuyển từ BaoCaoSuCoDashboardService cũ). Lọc theo năm của thời điểm nhập;
/// dữ liệu import Excel không có thời điểm nhập nên không nằm trong thống kê.
/// DbContext không chạy song song được nên các truy vấn await tuần tự.
/// </summary>
public class IncidentDashboardService(
    IIncidentDashboardRepository dashboardRepository,
    IOrgUnitService orgUnitService) : IIncidentDashboardService
{
    private const string UnclassifiedLabel = "(Chưa phân loại)";
    private const string EmptyLabel = "(Chưa nhập)";
    private const string NoWorkshopLabel = "(Chưa gán xưởng)";

    public async Task<IncidentDashboardDto> GetDashboardAsync(
        IncidentDashboardFilterRequest filter, CancellationToken cancellationToken)
    {
        var now = DateTime.Now; // cùng giờ địa phương với ReportedAt lúc tạo
        var year = GetYear(filter.Year, now);
        var workshopNames = await GetWorkshopNamesAsync(cancellationToken);

        var dashboard = new IncidentDashboardDto { Year = year, RepeatThreshold = IncidentRules.RepeatThreshold };
        if (filter.WorkshopId is { } workshopId)
        {
            if (!workshopNames.TryGetValue(workshopId, out var workshopName))
            {
                throw new NotFoundException("Không tìm thấy xưởng.");
            }

            dashboard.WorkshopId = workshopId;
            dashboard.WorkshopName = workshopName;
        }

        var workshopRows = await dashboardRepository.CountByWorkshopAsync(
            year, filter.WorkshopId, now, cancellationToken);
        var typeRows = await dashboardRepository.CountByGroupAsync(
            year, filter.WorkshopId, x => x.IncidentType, cancellationToken);
        var shiftRows = await dashboardRepository.CountByGroupAsync(
            year, filter.WorkshopId, x => x.Shift, cancellationToken);
        var stopLevelRows = await dashboardRepository.CountByGroupAsync(
            year, filter.WorkshopId, x => x.StopLevel, cancellationToken);
        var affectedCount = await dashboardRepository.CountAffectsProductionAsync(
            year, filter.WorkshopId, cancellationToken);
        dashboard.RepeatedEquipmentCount = await dashboardRepository.CountRepeatedEquipmentAsync(
            year, filter.WorkshopId, IncidentRules.RepeatThreshold, cancellationToken);

        var total = workshopRows.Sum(x => x.Count);
        var overdue = workshopRows.Sum(x => x.OverdueCount);

        dashboard.TotalCount = total;
        dashboard.OverdueCount = overdue;
        dashboard.OverduePercent = IncidentRules.GetPercent(overdue, total);
        dashboard.AnalysisOverdueCount = workshopRows.Sum(x => x.AnalysisOverdueCount);
        dashboard.SupplementOverdueCount = workshopRows.Sum(x => x.SupplementOverdueCount);

        dashboard.ByIncidentType = MergeGroups(typeRows, total, UnclassifiedLabel)
            .OrderByDescending(x => x.Count)
            .ToList();

        // Kíp sắp theo tên (A, B, C) cho dễ đọc, nhóm chưa nhập để cuối
        dashboard.ByShift = MergeGroups(shiftRows, total, EmptyLabel)
            .OrderBy(x => x.Name == EmptyLabel)
            .ThenBy(x => x.Name)
            .ToList();

        dashboard.ByStopLevel = MergeGroups(stopLevelRows, total, EmptyLabel)
            .OrderByDescending(x => x.Count)
            .ToList();

        dashboard.ProductionImpact = new ProductionImpactDto
        {
            AffectedCount = affectedCount,
            AffectedPercent = IncidentRules.GetPercent(affectedCount, total),
            NotAffectedCount = total - affectedCount,
            NotAffectedPercent = IncidentRules.GetPercent(total - affectedCount, total),
        };

        if (filter.WorkshopId is null)
        {
            dashboard.ByWorkshop = workshopRows
                .Select(x => new WorkshopStatisticDto
                {
                    WorkshopId = x.WorkshopId,
                    WorkshopName = GetWorkshopName(workshopNames, x.WorkshopId),
                    Count = x.Count,
                    Percent = IncidentRules.GetPercent(x.Count, total),
                    OverdueCount = x.OverdueCount,
                    AnalysisOverdueCount = x.AnalysisOverdueCount,
                    SupplementOverdueCount = x.SupplementOverdueCount,
                    OverduePercent = IncidentRules.GetPercent(x.OverdueCount, x.Count),
                    OverdueShareOfTotal = IncidentRules.GetPercent(x.OverdueCount, overdue),
                })
                .OrderByDescending(x => x.Count)
                .ToList();
        }

        return dashboard;
    }

    public async Task<IReadOnlyList<RepeatedEquipmentDto>> GetRepeatedEquipmentAsync(
        RepeatedEquipmentFilterRequest filter, CancellationToken cancellationToken)
    {
        var year = GetYear(filter.Year, DateTime.Now);
        var threshold = filter.Threshold is > 0 ? filter.Threshold.Value : IncidentRules.RepeatThreshold;

        var items = await dashboardRepository.GetRepeatedEquipmentAsync(
            year, filter.WorkshopId, threshold, cancellationToken);

        var workshopNames = await GetWorkshopNamesAsync(cancellationToken);
        foreach (var item in items)
        {
            item.WorkshopName = GetWorkshopName(workshopNames, item.WorkshopId);
        }

        return items;
    }

    private static int GetYear(int? year, DateTime now)
    {
        var value = year ?? now.Year;
        if (value is < 2000 or > 2100)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.",
                new Dictionary<string, string[]> { ["year"] = ["Năm không hợp lệ."] });
        }

        return value;
    }

    /// <summary>Gồm cả xưởng đã ngừng hoạt động để dữ liệu năm cũ vẫn có tên.</summary>
    private async Task<Dictionary<int, string>> GetWorkshopNamesAsync(CancellationToken cancellationToken) =>
        (await orgUnitService.GetTopLevelUnitsAsync(includeInactive: true, cancellationToken))
        .ToDictionary(x => x.Id, x => x.Name);

    private static string GetWorkshopName(Dictionary<int, string> names, int? workshopId) =>
        workshopId is { } id && names.TryGetValue(id, out var name) ? name : NoWorkshopLabel;

    /// <summary>Gộp các giá trị chỉ khác khoảng trắng; rỗng đưa về nhãn mặc định; tính % trên tổng.</summary>
    private static IEnumerable<GroupStatisticDto> MergeGroups(
        IEnumerable<GroupStatisticDto> rows, int total, string emptyLabel) =>
        rows.GroupBy(x => string.IsNullOrWhiteSpace(x.Name) ? emptyLabel : x.Name.Trim())
            .Select(g =>
            {
                var count = g.Sum(x => x.Count);
                return new GroupStatisticDto
                {
                    Name = g.Key,
                    Count = count,
                    Percent = IncidentRules.GetPercent(count, total),
                };
            });
}
