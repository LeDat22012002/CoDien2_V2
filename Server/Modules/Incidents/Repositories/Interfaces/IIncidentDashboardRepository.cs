using System.Linq.Expressions;
using Server.Modules.Incidents.DTOs;
using Server.Modules.Incidents.Entities;

namespace Server.Modules.Incidents.Repositories.Interfaces;

/// <summary>Mọi hàm nhận workshopId tùy chọn: null = toàn nhà máy. Chỉ tính báo cáo có ReportedAt thuộc năm.</summary>
public interface IIncidentDashboardRepository
{
    /// <summary>Đếm theo 1 cột chuỗi (loại sự cố, kíp, dừng đến cấp); chưa gộp khoảng trắng.</summary>
    Task<IReadOnlyList<GroupStatisticDto>> CountByGroupAsync(
        int year, int? workshopId, Expression<Func<Incident, string>> key, CancellationToken cancellationToken);

    Task<int> CountAffectsProductionAsync(int year, int? workshopId, CancellationToken cancellationToken);

    /// <summary>Đếm tổng và quá hạn theo xưởng.</summary>
    Task<IReadOnlyList<WorkshopCountRow>> CountByWorkshopAsync(
        int year, int? workshopId, DateTime now, CancellationToken cancellationToken);

    Task<List<RepeatedEquipmentDto>> GetRepeatedEquipmentAsync(
        int year, int? workshopId, int threshold, CancellationToken cancellationToken);

    Task<int> CountRepeatedEquipmentAsync(int year, int? workshopId, int threshold, CancellationToken cancellationToken);
}
