using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

// ===== Entity =====

/// <summary>
/// Form tuần của 1 đơn vị báo cáo trong 1 kỳ tuần, gồm 2 giai đoạn Kế hoạch (PLAN) và Báo cáo (REPORT) dùng chung các dòng.
/// Thông tin chụp (xưởng, tên, tiền tố, loại giờ công, giờ công hiệu dụng, KTV) cập nhật theo hiện tại khi báo cáo còn mở,
/// cố định khi đã khóa báo cáo; tiền tố chỉ cập nhật khi form chưa cấp mã công việc nào.
/// </summary>
public class WeeklyForm : BaseEntity
{
    public int WorkReportUnitId { get; set; }

    public int WorkWeekId { get; set; }

    /// <summary>OrgUnit.Id của xưởng chứa đơn vị lúc chụp; lưới/tổng hợp của xưởng lọc theo cột này.</summary>
    public int WorkshopId { get; set; }

    public string UnitName { get; set; } = string.Empty;

    /// <summary>Tiền tố dùng sinh mã công việc của form.</summary>
    public string CodePrefix { get; set; } = string.Empty;

    /// <summary>HC | KIP.</summary>
    public string LaborType { get; set; } = LaborTypes.Hc;

    /// <summary>Giờ công hiệu dụng/tuần (phút) theo loại giờ công, dùng quy đổi nhân lực.</summary>
    public decimal CapacityMinutes { get; set; }

    /// <summary>Tên KTV phụ trách, cách nhau dấu phẩy.</summary>
    public string? EngineerNames { get; set; }

    // ===== GĐ 3 (khóa / mở khóa) =====

    /// <summary>Thời điểm tác vụ nền ghi nhận kế hoạch đã khóa (chỉ để thống kê; trạng thái khóa tính theo hạn).</summary>
    public DateTime? PlanLockedAt { get; set; }

    public DateTime? ReportLockedAt { get; set; }

    /// <summary>Quản đốc mở khóa kế hoạch tới thời điểm này.</summary>
    public DateTime? PlanUnlockedUntil { get; set; }

    public DateTime? ReportUnlockedUntil { get; set; }

    public WorkReportUnit WorkReportUnit { get; set; } = null!;

    public WorkWeek WorkWeek { get; set; } = null!;

    public ICollection<WorkItem> Items { get; set; } = [];
}

// ===== Giá trị cố định =====

/// <summary>Giai đoạn của form tuần.</summary>
public static class WorkReportPhases
{
    /// <summary>Kế hoạch tuần (lập trong tuần trước).</summary>
    public const string Plan = "PLAN";

    /// <summary>Báo cáo thực hiện tuần.</summary>
    public const string Report = "REPORT";

    public static readonly IReadOnlyCollection<string> All = [Plan, Report];
}

/// <summary>Trạng thái 1 giai đoạn của form tại thời điểm xem.</summary>
public static class FormPhaseStatuses
{
    /// <summary>Chưa tới lúc nhập (báo cáo trước thứ 2 của tuần).</summary>
    public const string NotStarted = "NOT_STARTED";

    public const string Open = "OPEN";

    /// <summary>Quá hạn, chỉ quản đốc/phó sửa được.</summary>
    public const string Locked = "LOCKED";
}
