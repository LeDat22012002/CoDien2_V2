using Server.Modules.Incidents.DTOs;

namespace Server.Modules.Incidents.Services.Interfaces;

public interface IIncidentDashboardService
{
    /// <summary>Toàn nhà máy (kèm thống kê theo xưởng) hoặc 1 xưởng khi có WorkshopId.</summary>
    Task<IncidentDashboardDto> GetDashboardAsync(
        IncidentDashboardFilterRequest filter, CancellationToken cancellationToken);

    Task<IReadOnlyList<RepeatedEquipmentDto>> GetRepeatedEquipmentAsync(
        RepeatedEquipmentFilterRequest filter, CancellationToken cancellationToken);
}
