using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;

namespace Server.Modules.WorkReports.Services;

public class OrgTreeProvider(IOrgUnitService orgUnitService) : IOrgTreeProvider
{
    private OrgTree? _tree;

    public async Task<OrgTree> GetAsync(CancellationToken cancellationToken)
    {
        if (_tree is not null)
        {
            return _tree;
        }

        var units = await orgUnitService.GetListAsync(
            new OrgUnitFilterRequest { IncludeInactive = true }, cancellationToken);
        return _tree = new OrgTree(units);
    }
}