namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class WorkReportSettingDto
{
    public decimal HcMinutesPerWeek { get; init; }
    public decimal ShiftMinutesPerWeek { get; init; }

    /// <summary>Số ngày kể từ thứ 2 của tuần tới ngày hạn: 7 = thứ 2 tuần sau, 5 = thứ 7 cùng tuần.</summary>
    public int DeadlineDayOffset { get; init; }

    public TimeOnly DeadlineTime { get; init; }
    public int WarnDaysBefore { get; init; }

    /// <summary>Mô tả dễ đọc, vd "Báo cáo: Thứ 2 tuần sau 11:00 · Kế hoạch tuần tới: cùng lúc".</summary>
    public string DeadlineDescription { get; init; } = string.Empty;
}

// ===== Request =====

public class UpdateWorkReportSettingRequest
{
    public decimal HcMinutesPerWeek { get; set; }
    public decimal ShiftMinutesPerWeek { get; set; }
    public int DeadlineDayOffset { get; set; }
    public TimeOnly DeadlineTime { get; set; }
    public int WarnDaysBefore { get; set; }
}