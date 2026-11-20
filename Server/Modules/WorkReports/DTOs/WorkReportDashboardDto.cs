namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

/// <summary>
/// Trang công khai, tab "Hôm nay": lưới của từng xưởng công khai, chỉ giữ dòng có khoảng ngày làm phủ ngày Date
/// (cùng dạng với lưới Chi tiết tuần để dùng chung bảng). Báo cáo: dòng báo cáo của tuần chứa Date;
/// kế hoạch: dòng kế hoạch của tuần chứa Date.
/// </summary>
public class DailyWorkDto<TForm> where TForm : WeeklyFormDto
{
    public DateOnly Date { get; init; }

    /// <summary>PLAN | REPORT.</summary>
    public string Phase { get; init; } = string.Empty;

    /// <summary>Tuần chứa Date; null = chưa có kỳ tuần (chưa tạo).</summary>
    public WorkWeekDto? Week { get; init; }

    /// <summary>Xưởng công khai theo thứ tự sơ đồ (kể cả xưởng không có việc trong ngày).</summary>
    public IReadOnlyList<DailyWorkshopDto<TForm>> Workshops { get; init; } = [];
}

public class DailyWorkshopDto<TForm> where TForm : WeeklyFormDto
{
    public int WorkshopId { get; init; }
    public string WorkshopName { get; init; } = string.Empty;

    /// <summary>Số dòng trong ngày của cả xưởng.</summary>
    public int ItemCount { get; init; }

    /// <summary>
    /// Lưới của xưởng: chỉ tổ/kíp có việc trong ngày; mỗi form chỉ dòng trong ngày, ItemCount / tổng phút tính theo ngày,
    /// không kèm gợi ý.
    /// </summary>
    public WorkGridDto<TForm> Grid { get; init; } = null!;
}

/// <summary>
/// Trang công khai, tab "Phân tích": kế hoạch và thực hiện của cùng tuần Week theo xưởng công khai.
/// </summary>
public class WorkReportDashboardDto
{
    public WorkWeekDto Week { get; init; } = null!;

    /// <summary>Đầu mục có phút thực tế ở ít nhất 1 xưởng (theo thứ tự nhóm A, B…).</summary>
    public IReadOnlyList<WorkCategoryDto> Categories { get; init; } = [];

    public IReadOnlyList<DashboardWorkshopDto> Workshops { get; init; } = [];
}

/// <summary>Số liệu 1 xưởng trong tuần: kế hoạch lấy từ form kế hoạch, thực tế lấy từ form báo cáo của cùng tuần.</summary>
public class DashboardWorkshopDto
{
    public int WorkshopId { get; init; }
    public string WorkshopName { get; init; } = string.Empty;

    /// <summary>Số dòng ở form kế hoạch của tuần.</summary>
    public int PlannedItemCount { get; init; }

    /// <summary>Số dòng ở form báo cáo của tuần (gồm phát sinh).</summary>
    public int ActualItemCount { get; init; }

    /// <summary>Trong ActualItemCount: dòng phát sinh (không có trong kế hoạch).</summary>
    public int UnplannedItemCount { get; init; }

    /// <summary>Số mã khác nhau trong vật tư kế hoạch.</summary>
    public int PlannedMaterialCodeCount { get; init; }

    /// <summary>Số mã khác nhau trong vật tư báo cáo (bỏ vật tư có số lượng thực tế = 0).</summary>
    public int ActualMaterialCodeCount { get; init; }

    /// <summary>Giờ công kế hoạch (phút): tổng cột (11) của form kế hoạch.</summary>
    public decimal PlannedMinutes { get; init; }

    /// <summary>Giờ công thực tế (phút): tổng cột (12) của báo cáo, trống = kế hoạch của dòng.</summary>
    public decimal ActualMinutes { get; init; }

    /// <summary>% = thực tế ÷ kế hoạch × 100 (null khi kế hoạch = 0).</summary>
    public decimal? CompletionPercent { get; init; }

    /// <summary>Phút thực tế theo đầu mục; Percent = % trong tổng phút thực tế của xưởng.</summary>
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
    /// <summary>Tuần; trống = tuần đang nhập báo cáo hiện tại.</summary>
    public int? WeekId { get; set; }
}