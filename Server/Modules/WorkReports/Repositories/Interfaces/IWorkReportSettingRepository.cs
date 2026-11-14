using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Repositories.Interfaces;

public interface IWorkReportSettingRepository
{
    /// <summary>Không tracking. Chưa có dòng (seeder chưa chạy) thì trả giá trị mặc định chưa lưu.</summary>
    Task<WorkReportSetting> GetAsync(CancellationToken cancellationToken);

    /// <summary>Có tracking; null nếu chưa có dòng.</summary>
    Task<WorkReportSetting?> FindAsync(CancellationToken cancellationToken);

    void Add(WorkReportSetting setting);
}