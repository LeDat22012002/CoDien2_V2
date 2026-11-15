using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>
/// Tính phạm vi xem/sửa/mở khóa/phân công: mã quyền quyết định vai trò, sơ đồ tổ chức quyết định đơn vị:
/// work-reports.submit + phân công → kỹ sư phụ trách tổ/kíp; work-reports.manage + trưởng/phó Đội → các tổ trong đội,
/// + trưởng/phó đơn vị cấp 1 → cả xưởng; work-reports.configure → cấu hình, mở khóa, phân công.
/// Trang công khai (Ban Giám đốc) gọi UsePublicView: xem mọi xưởng, không sửa, không cần đăng nhập.
/// </summary>
public interface IWorkReportScopeService
{
    Task<WorkReportScope> GetScopeAsync(CancellationToken cancellationToken);

    /// <summary>Request của trang công khai: phạm vi = chỉ xem mọi xưởng, bỏ qua người đăng nhập (gọi trước mọi hàm khác).</summary>
    void UsePublicView();

    /// <summary>Quyền của người gọi trên 1 đơn vị báo cáo.</summary>
    Task<WorkReportUnitAccessDto> GetUnitAccessAsync(WorkReportUnit unit, CancellationToken cancellationToken);

    /// <summary>Quyền trên form của đơn vị; workshopId = xưởng đã chụp trong form (null = xưởng hiện tại trên sơ đồ).</summary>
    Task<WorkReportUnitAccessDto> GetUnitAccessAsync(
        WorkReportUnit unit, int? workshopId, CancellationToken cancellationToken);

    /// <summary>Admin hoặc quản đốc/phó của xưởng: cấu hình đơn vị báo cáo, mở khóa.</summary>
    Task<bool> CanManageWorkshopAsync(int workshopId, CancellationToken cancellationToken);

    Task<MyWorkReportScopeDto> GetMyScopeAsync(CancellationToken cancellationToken);
}