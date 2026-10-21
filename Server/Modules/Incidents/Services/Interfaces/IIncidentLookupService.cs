namespace Server.Modules.Incidents.Services.Interfaces;

/// <summary>
/// Tra cứu nhẹ cho module khác (Equipments). Tách khỏi IIncidentService vì IncidentService phụ thuộc IEquipmentService,
/// gộp chung sẽ thành vòng phụ thuộc DI.
/// </summary>
public interface IIncidentLookupService
{
    Task<bool> HasByEquipmentCodeAsync(string equipmentCode, CancellationToken cancellationToken);
}
