using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Organization.Entities;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Mặc định mỗi tổ/kíp đang hoạt động trên sơ đồ là 1 đơn vị báo cáo (không cần quản đốc xác nhận).
/// Gọi khi mở lưới / danh sách đơn vị của xưởng và trong tác vụ nền. Tổ/kíp có đơn vị đã bị xóa thì không tạo lại.
/// </summary>
public class WorkReportUnitSyncService(
    IWorkReportUnitRepository unitRepository,
    IOrgTreeProvider orgTreeProvider,
    IUnitOfWork unitOfWork,
    ILogger<WorkReportUnitSyncService> logger) : IWorkReportUnitSyncService
{
    private const int SortOrderStep = 10;

    /// <summary>Loại đơn vị trên sơ đồ tự thành đơn vị báo cáo.</summary>
    public static readonly IReadOnlySet<string> ReportableTypes =
        new HashSet<string> { OrgUnitTypeCodes.Group, OrgUnitTypeCodes.Shift };

    public async Task<IReadOnlyList<int>> EnsureFromOrgChartAsync(int? workshopId, CancellationToken cancellationToken)
    {
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var workshops = tree.GetWorkshops().Where(x => workshopId is null || x.Id == workshopId).ToList();
        if (workshops.Count == 0)
        {
            return [];
        }

        var allUnits = await unitRepository.GetAllIncludingDeletedAsync(cancellationToken);
        var chartOrgUnitIds = allUnits.Where(x => !x.IsCustom).Select(x => x.OrgUnitId).ToHashSet();
        var liveUnitsByWorkshop = allUnits
            .Where(x => !x.IsDeleted)
            .ToLookup(x => tree.GetWorkshop(x.OrgUnitId)?.Id ?? 0);

        var added = new List<WorkReportUnit>();
        foreach (var workshop in workshops)
        {
            var missing = tree.GetDescendants(workshop.Id)
                .Where(x => x.IsActive && ReportableTypes.Contains(x.TypeCode) && !chartOrgUnitIds.Contains(x.Id))
                .ToList();
            if (missing.Count == 0)
            {
                continue;
            }

            var existing = liveUnitsByWorkshop[workshop.Id].ToList();
            var usedPrefixes = new HashSet<string>(existing.Select(x => x.CodePrefix), StringComparer.OrdinalIgnoreCase);
            var sortOrder = existing.Count == 0 ? 0 : existing.Max(x => x.SortOrder);

            foreach (var orgUnit in missing)
            {
                var prefix = WorkReportUnitPrefixes.MakeUnique(WorkReportUnitPrefixes.Suggest(orgUnit), usedPrefixes);
                usedPrefixes.Add(prefix);

                var unit = new WorkReportUnit
                {
                    OrgUnitId = orgUnit.Id,
                    DisplayName = orgUnit.Name,
                    CodePrefix = prefix,
                    LaborType = orgUnit.TypeCode == OrgUnitTypeCodes.Shift ? LaborTypes.Shift : LaborTypes.Hc,
                    SortOrder = sortOrder += SortOrderStep,
                    IsActive = true,
                };
                unitRepository.Add(unit);
                added.Add(unit);
            }
        }

        if (added.Count == 0)
        {
            return [];
        }

        try
        {
            await unitOfWork.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Đã tự tạo {Count} đơn vị báo cáo theo sơ đồ tổ chức", added.Count);
            return added.Select(x => x.Id).ToList();
        }
        catch (DbUpdateException ex)
        {
            // Request khác vừa tạo cùng tổ/kíp (trùng chỉ mục OrgUnitId): bỏ phần vừa thêm, lần sau đồng bộ lại
            logger.LogWarning(ex, "Đơn vị báo cáo đã được tiến trình khác tạo, bỏ qua");
            unitRepository.Detach(added);
            return [];
        }
    }
}
