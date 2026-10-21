using Server.Modules.Incidents.Repositories.Interfaces;
using Server.Modules.Incidents.Services.Interfaces;

namespace Server.Modules.Incidents.Services;

public class IncidentLookupService(IIncidentRepository incidentRepository) : IIncidentLookupService
{
    public Task<bool> HasByEquipmentCodeAsync(string equipmentCode, CancellationToken cancellationToken) =>
        incidentRepository.HasByEquipmentCodeAsync(equipmentCode, cancellationToken);
}
