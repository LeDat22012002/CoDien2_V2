using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

// ===== Entity =====

/// <summary>Cấu hình chung của báo cáo tuần (chỉ 1 dòng, seeder tạo sẵn).</summary>
public class WorkReportSetting : BaseEntity
{
    /// <summary>Giờ công hiệu dụng/tuần của tổ hành chính (phút): 7.5 × 60 × 6 = 2700.</summary>
    public decimal HcMinutesPerWeek { get; set; } = WorkReportDefaults.HcMinutesPerWeek;

    /// <summary>Giờ công hiệu dụng/tuần của kíp (phút): ((2×10×7/3 × 4.33) − 24) / 4.33 × 60 ≈ 2467.44.</summary>
    public decimal ShiftMinutesPerWeek { get; set; } = WorkReportDefaults.ShiftMinutesPerWeek;

    /// <summary>
    /// Hạn nộp tính bằng số ngày kể từ thứ 2 của tuần: 7 = thứ 2 tuần sau (mặc định), 5 = thứ 7 cùng tuần.
    /// Hạn báo cáo tuần N = T2(N) + offset; hạn kế hoạch tuần N = hạn báo cáo tuần N−1 = T2(N) + offset − 7.
    /// </summary>
    public int DeadlineDayOffset { get; set; } = WorkReportDefaults.DeadlineDayOffset;

    /// <summary>Giờ khóa trong ngày hạn (giờ địa phương), mặc định 11:00.</summary>
    public TimeOnly DeadlineTime { get; set; } = WorkReportDefaults.DeadlineTime;

    /// <summary>Cảnh báo trên web trước hạn bao nhiêu ngày (mặc định 2: thứ 7 và Chủ nhật).</summary>
    public int WarnDaysBefore { get; set; } = WorkReportDefaults.WarnDaysBefore;
}

// ===== Giá trị mặc định =====

public static class WorkReportDefaults
{
    public const decimal HcMinutesPerWeek = 2700m;
    public const decimal ShiftMinutesPerWeek = 2467.44m;
    public const int DeadlineDayOffset = 7;
    public const int WarnDaysBefore = 2;
    public static readonly TimeOnly DeadlineTime = new(11, 0);
}