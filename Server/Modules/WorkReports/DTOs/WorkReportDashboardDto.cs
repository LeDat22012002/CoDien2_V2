namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

/// <summary>
/// Trang công khai, tab "Hôm nay": dòng có khoảng ngày làm phủ ngày Date của các xưởng công khai.
/// Báo cáo: dòng báo cáo của tuần chứa Date; kế hoạch: dòng kế hoạch của tuần chứa Date.
/// </summary>
public class DailyWorkDto<TItem> where TItem : WorkItemDtoBase
{
    public DateOnly Date { get; init; }

    /// <summary>PLAN | REPORT.</summary>
    public string Phase { get; init; } = string.Empty;

    /// <summary>Tuần chứa Date; null = chưa có kỳ tuần (chưa tạo).</summary>
    public WorkWeekDto? Week { get; init; }

    public IReadOnlyList<DailyWorkshopDto<TItem>> Workshops { get; init; } = [];
}

public class DailyWorkshopDto<TItem> where TItem : WorkItemDtoBase
{
    public int WorkshopId { get; init; }
    public string WorkshopName { get; init; } = string.Empty;
    public int ItemCount { get; init; }

    /// <summary>Tổ/kíp có dòng trong ngày (theo thứ tự I, II…).</summary>
    public IReadOnlyList<DailyUnitDto<TItem>> Units { get; init; } = [];
}

public class DailyUnitDto<TItem> where TItem : WorkItemDtoBase
{
    public int FormId { get; init; }
    public int UnitId { get; init; }
    public string OrderLabel { get; init; } = string.Empty;
    public string UnitName { get; init; } = string.Empty;

    /// <summary>KTV của tổ/kíp (dòng cũ chưa lưu KTV theo dòng).</summary>
    public string? EngineerNames { get; init; }

    public IReadOnlyList<TItem> Items { get; init; } = [];
}

/// <summary>
/// Trang công khai, tab "Phân tích": báo cáo tuần ReportWeek và kế hoạch tuần kế tiếp (PlanWeek) của các xưởng công khai.
/// </summary>
public class WorkReportDashboardDto
{
    public WorkWeekDto ReportWeek { get; init; } = null!;

    /// <summary>Tuần kế tiếp ReportWeek; null = chưa có kỳ tuần.</summary>
    public WorkWeekDto? PlanWeek { get; init; }

    /// <summary>Đầu mục có số liệu ở ít nhất 1 xưởng (theo thứ tự nhóm A, B…).</summary>
    public IReadOnlyList<WorkCategoryDto> Categories { get; init; } = [];

    public IReadOnlyList<DashboardWorkshopDto> Workshops { get; init; } = [];
}

public class DashboardWorkshopDto
{
    public int WorkshopId { get; init; }
    public string WorkshopName { get; init; } = string.Empty;

    /// <summary>Báo cáo tuần ReportWeek.</summary>
    public DashboardWeekStatsDto Report { get; init; } = new();

    /// <summary>Kế hoạch tuần PlanWeek (rỗng khi chưa có tuần).</summary>
    public DashboardWeekStatsDto Plan { get; init; } = new();
}

/// <summary>Số liệu 1 xưởng trong 1 tuần.</summary>
public class DashboardWeekStatsDto
{
    public int ItemCount { get; init; }

    /// <summary>Việc phát sinh (báo cáo, không có trong kế hoạch).</summary>
    public int UnplannedCount { get; init; }

    /// <summary>Giờ công kế hoạch (phút): tổng cột (11).</summary>
    public decimal PlannedMinutes { get; init; }

    /// <summary>Giờ công thực tế (phút): tổng cột (12), trống = kế hoạch. Kế hoạch: bằng PlannedMinutes.</summary>
    public decimal ActualMinutes { get; init; }

    /// <summary>% thực hiện = thực tế ÷ kế hoạch × 100 (null khi kế hoạch = 0).</summary>
    public decimal? CompletionPercent { get; init; }

    /// <summary>Giờ công hiệu dụng của mọi tổ/kíp (phút) để so sánh tải.</summary>
    public decimal CapacityMinutes { get; init; }

    /// <summary>Số mã vật tư khác nhau (không cộng số lượng khác đơn vị tính).</summary>
    public int MaterialCodeCount { get; init; }

    /// <summary>Số dòng vật tư.</summary>
    public int MaterialLineCount { get; init; }

    /// <summary>Phút theo đầu mục: báo cáo = thực tế, kế hoạch = kế hoạch; Percent = % trong tổng của xưởng.</summary>
    public IReadOnlyList<DashboardCategoryMinutesDto> Categories { get; init; } = [];
}

public class DashboardCategoryMinutesDto
{
    public int CategoryId { get; init; }
    public decimal Minutes { get; init; }
    public decimal Percent { get; init; }
}

// ===== Request =====

public class DailyWorkRequest
{
    /// <summary>Trống = hôm nay (tab báo cáo) / ngày mai (tab kế hoạch) do Client gửi.</summary>
    public DateOnly? Date { get; set; }
}

public class WorkReportDashboardRequest
{
    /// <summary>Tuần báo cáo; trống = tuần đang nhập báo cáo hiện tại.</summary>
    public int? WeekId { get; set; }
}
