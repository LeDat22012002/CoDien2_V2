using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;

namespace Server.Modules.WorkReports.Repositories;

public class WorkReportSettingRepository(AppDbContext dbContext) : IWorkReportSettingRepository
{
    private DbSet<WorkReportSetting> Settings => dbContext.Set<WorkReportSetting>();

    public async Task<WorkReportSetting> GetAsync(CancellationToken cancellationToken) =>
        await Settings.AsNoTracking().OrderBy(x => x.Id).FirstOrDefaultAsync(cancellationToken)
        ?? new WorkReportSetting();

    public Task<WorkReportSetting?> FindAsync(CancellationToken cancellationToken) =>
        Settings.OrderBy(x => x.Id).FirstOrDefaultAsync(cancellationToken);

    public void Add(WorkReportSetting setting) => Settings.Add(setting);
}