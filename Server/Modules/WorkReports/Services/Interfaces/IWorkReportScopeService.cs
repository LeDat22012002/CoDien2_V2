using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>
/// Tính phạm vi xem/sửa/mở khóa/phân công theo sơ đồ tổ chức (không dùng mã quyền cho từng tổ):
/// kỹ sư phụ trách → tổ/kíp được phân công; đội trưởng/phó → các tổ trong đội; quản đốc/phó → cả xưởng;
/// work-reports.view-factory / trưởng phó Nhà máy → xem mọi xưởng; work-reports.configure → cấu hình, mở khóa, phân công.
/// </summary>
public interface IWorkReportScopeService
{
    Task<WorkReportScope> GetScopeAsync(CancellationToken cancellationToken);

    /// <summary>Quyền của người gọi trên 1 đơn vị báo cáo.</summary>
    Task<WorkReportUnitAccessDto> GetUnitAccessAsync(WorkReportUnit unit, CancellationToken cancellationToken);

    /// <summary>Admin hoặc quản đốc/phó của xưởng: cấu hình đơn vị báo cáo, mở khóa.</summary>
    Task<bool> CanManageWorkshopAsync(int workshopId, CancellationToken cancellationToken);

    Task<MyWorkReportScopeDto> GetMyScopeAsync(CancellationToken cancellationToken);
}