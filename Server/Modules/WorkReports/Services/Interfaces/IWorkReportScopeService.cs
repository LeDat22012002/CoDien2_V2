using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>
/// Tính phạm vi xem/sửa/mở khóa/phân công: mã quyền quyết định vai trò, sơ đồ tổ chức quyết định đơn vị:
/// work-reports.submit + phân công → kỹ sư phụ trách tổ/kíp (mặc định thêm/sửa/xóa kế hoạch, báo cáo của tổ/kíp đó);
/// work-reports.manage + trưởng/phó Đội → xem, phân công các tổ trong đội; + trưởng/phó đơn vị cấp 1 → cả xưởng, cấu hình tổ/kíp;
/// work-reports.plan.* / report.* (admin cấp) → thêm/sửa/xóa trong đội/xưởng mình là trưởng/phó (admin: mọi xưởng);
/// work-reports.configure → cấu hình, mở khóa, phân công.
/// Trang công khai (Ban Giám đốc) gọi UsePublicViewAsync: xem các xưởng công khai, không sửa, không cần đăng nhập.
/// </summary>
public interface IWorkReportScopeService
{
    Task<WorkReportScope> GetScopeAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Request của trang công khai: phạm vi = chỉ xem các xưởng được bật trong Cài đặt (chưa cấu hình = mọi xưởng),
    /// bỏ qua người đăng nhập (gọi trước mọi hàm khác).
    /// </summary>
    Task UsePublicViewAsync(CancellationToken cancellationToken);

    /// <summary>Quyền của người gọi trên 1 đơn vị báo cáo.</summary>
    Task<WorkReportUnitAccessDto> GetUnitAccessAsync(WorkReportUnit unit, CancellationToken cancellationToken);

    /// <summary>
    /// Quyền trên form của đơn vị; workshopId = xưởng đã chụp trong form (null = xưởng hiện tại trên sơ đồ);
    /// week = tuần của form: kỹ sư từng phụ trách đơn vị trong tuần đó được xem (không sửa) dù đã bị thay người.
    /// </summary>
    Task<WorkReportUnitAccessDto> GetUnitAccessAsync(
        WorkReportUnit unit, int? workshopId, WorkWeek? week, CancellationToken cancellationToken);

    /// <summary>Admin hoặc quản đốc/phó của xưởng (work-reports.manage): cấu hình đơn vị báo cáo.</summary>
    Task<bool> CanManageWorkshopAsync(int workshopId, CancellationToken cancellationToken);

    Task<MyWorkReportScopeDto> GetMyScopeAsync(CancellationToken cancellationToken);
}