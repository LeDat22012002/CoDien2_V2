namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>Đọc cây đơn vị 1 lần cho mỗi request (Scoped) qua IOrgUnitService.</summary>
public interface IOrgTreeProvider
{
    Task<OrgTree> GetAsync(CancellationToken cancellationToken);
}