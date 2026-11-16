using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>
/// Phần chung của kế hoạch và báo cáo: form tuần, quyền + trạng thái giai đoạn, mở khóa, khung lưới / tổng hợp.
/// Dòng và vật tư của từng giai đoạn ở IWorkPlanService / IWorkReportService và các service vật tư.
/// </summary>
public interface IWeeklyFormService
{
    /// <summary>
    /// Đồng bộ form của các tuần đang làm việc (tuần trước nếu báo cáo chưa khóa, tuần này, tuần sau), tự SaveChanges:
    /// tạo form còn thiếu cho đơn vị đang dùng; cập nhật thông tin chụp của form chưa khóa báo cáo;
    /// bỏ form trống của tuần chưa bắt đầu khi đơn vị đã ngừng. unitIds null = mọi đơn vị.
    /// Gọi sau khi đã lưu thay đổi của mình (tác vụ nền, thêm/sửa đơn vị, đổi kỹ sư, đổi cấu hình).
    /// </summary>
    Task SyncFormsAsync(IReadOnlyCollection<int>? unitIds, CancellationToken cancellationToken);

    /// <summary>
    /// Form + quyền + trạng thái giai đoạn. action khác View: người gọi phải làm được thao tác đó ngay
    /// (ném 403 nếu không có quyền, 400 nếu chưa tới tuần / đã khóa).
    /// </summary>
    Task<WeeklyFormContext> GetContextAsync(
        int formId, string phase, WorkItemAction action, CancellationToken cancellationToken);

    /// <summary>
    /// Form của xưởng trong tuần mà người gọi xem được, theo thứ tự đơn vị trong xưởng.
    /// Tuần đang làm việc thì tự tạo form còn thiếu. Không liên quan tới xưởng → 403.
    /// </summary>
    Task<IReadOnlyList<WeeklyFormContext>> GetVisibleFormsAsync(
        int workshopId, int weekId, string phase, int? unitId, CancellationToken cancellationToken);

    /// <summary>
    /// Dựng lưới của 1 giai đoạn: buildForms nhận các form xem được, trả DTO từng form + Id đầu mục đã có dòng
    /// (để giữ cột đầu mục đã ngừng dùng nhưng còn dữ liệu).
    /// </summary>
    Task<WorkGridDto<TForm>> BuildGridAsync<TForm>(
        WorkReportGridRequest request,
        string phase,
        Func<IReadOnlyList<WeeklyFormContext>, Task<(IReadOnlyList<TForm> Forms, IReadOnlySet<int> UsedCategoryIds)>> buildForms,
        CancellationToken cancellationToken)
        where TForm : WeeklyFormDto;

    /// <summary>Sheet Tổng hợp của 1 giai đoạn từ phút công theo (form, đầu mục) và vật tư của các form.</summary>
    Task<WorkReportSummaryDto> BuildSummaryAsync(
        WorkReportGridRequest request,
        string phase,
        Func<IReadOnlyList<int>, Task<IReadOnlyList<SummaryEntry>>> loadEntries,
        Func<IReadOnlyList<int>, Task<IReadOnlyList<SummaryMaterial>>> loadMaterials,
        CancellationToken cancellationToken);

    /// <summary>
    /// Admin mở khóa giai đoạn đã quá hạn của form tới request.Until (null = khóa lại ngay).
    /// </summary>
    Task UnlockAsync(int formId, string phase, UnlockFormRequest request, CancellationToken cancellationToken);
}

/// <summary>Phút công của 1 dòng cho Tổng hợp.</summary>
public readonly record struct SummaryEntry(int FormId, int CategoryId, decimal Minutes);

/// <summary>Vật tư của 1 form cho Tổng hợp (đếm đầu mã).</summary>
public readonly record struct SummaryMaterial(int FormId, string? MaterialCode, string MaterialName);
