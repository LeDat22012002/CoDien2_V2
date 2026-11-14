using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// Kỳ tuần (thứ 2 → Chủ nhật), đánh số theo tuần ISO trong năm. Tác vụ nền tạo trước tuần hiện tại và 2 tuần kế tiếp.
/// Nhãn tháng lấy theo ngày thứ 2 (tuần vắt tháng tính về tháng trước).
/// Hạn ở đây là hạn chung toàn nhà máy; hạn riêng 1 xưởng nằm ở <see cref="WorkWeekDeadlineOverride"/>.
/// Giờ lưu là giờ địa phương (server đặt giờ Việt Nam), giống các mốc giờ khác của hệ thống.
/// </summary>
public class WorkWeek : BaseEntity
{
    public int IsoYear { get; set; }

    public int IsoWeek { get; set; }

    /// <summary>Thứ 2.</summary>
    public DateOnly StartDate { get; set; }

    /// <summary>Chủ nhật.</summary>
    public DateOnly EndDate { get; set; }

    /// <summary>Tháng của ngày thứ 2.</summary>
    public int LabelMonth { get; set; }

    /// <summary>Năm của ngày thứ 2.</summary>
    public int LabelYear { get; set; }

    /// <summary>Hạn khóa kế hoạch của tuần này (mặc định thứ 2 của chính tuần, 11:00).</summary>
    public DateTime PlanDeadlineAt { get; set; }

    /// <summary>Hạn khóa báo cáo của tuần này (mặc định thứ 2 tuần sau, 11:00).</summary>
    public DateTime ReportDeadlineAt { get; set; }

    /// <summary>Admin đã chỉnh tay hạn chung → đổi cấu hình mặc định không ghi đè.</summary>
    public bool IsDeadlineCustomized { get; set; }

    public ICollection<WorkWeekDeadlineOverride> DeadlineOverrides { get; set; } = [];
}