namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

/// <summary>Form tuần của 1 đơn vị (1 nhóm cấp 1 trên lưới), kèm trạng thái giai đoạn và quyền của người gọi.</summary>
public abstract class WeeklyFormDto
{
    public int FormId { get; set; }
    public int UnitId { get; set; }
    public int WorkWeekId { get; set; }
    public int WorkshopId { get; set; }

    /// <summary>Thứ tự trong xưởng (1, 2…) và nhãn La Mã (I, II…).</summary>
    public int OrderNo { get; set; }

    public string OrderLabel { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public string CodePrefix { get; set; } = string.Empty;
    public string LaborType { get; set; } = string.Empty;
    public decimal CapacityMinutes { get; set; }
    public string? EngineerNames { get; set; }

    /// <summary>NOT_STARTED | OPEN | LOCKED của giai đoạn đang xem.</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>Hạn hiệu lực của giai đoạn đang xem (đã tính hạn riêng xưởng / mở khóa).</summary>
    public DateTime DeadlineAt { get; set; }

    public string PlanStatus { get; set; } = string.Empty;
    public DateTime PlanDeadlineAt { get; set; }
    public string ReportStatus { get; set; } = string.Empty;
    public DateTime ReportDeadlineAt { get; set; }

    /// <summary>Vai trò của người gọi trên đơn vị (WorkReportRoles).</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Thêm / sửa / xóa dòng (và vật tư) được ngay lúc này ở giai đoạn đang xem (đã tính trạng thái mở/khóa).</summary>
    public bool CanCreate { get; set; }

    public bool CanUpdate { get; set; }
    public bool CanDelete { get; set; }

    /// <summary>Một trong 3 quyền trên.</summary>
    public bool CanEditNow => CanCreate || CanUpdate || CanDelete;

    /// <summary>Admin: mở khóa / khóa lại giai đoạn đang xem khi đã quá hạn.</summary>
    public bool CanUnlock { get; set; }

    /// <summary>Đã quá hạn nhưng đang được admin mở khóa (tới DeadlineAt).</summary>
    public bool IsUnlocked { get; set; }

    public int ItemCount { get; set; }

    /// <summary>Tổng (11) của các dòng đang hiện.</summary>
    public decimal TotalPlannedMinutes { get; set; }

    /// <summary>Tổng (12) (thực tế, trống = kế hoạch) của các dòng đang hiện; kế hoạch = tổng (11).</summary>
    public decimal TotalActualMinutes { get; set; }
}

public class WeeklyPlanFormDto : WeeklyFormDto
{
    /// <summary>Dòng kế hoạch theo thứ tự đầu mục rồi thứ tự dòng.</summary>
    public IReadOnlyList<WorkPlanItemDto> Items { get; set; } = [];
}

public class WeeklyReportFormDto : WeeklyFormDto
{
    /// <summary>Dòng báo cáo theo thứ tự đầu mục rồi thứ tự dòng.</summary>
    public IReadOnlyList<WorkReportItemDto> Items { get; set; } = [];

    /// <summary>
    /// Dòng kế hoạch chưa đưa vào báo cáo (gợi ý). Chỉ trả cho người đang thêm được dòng báo cáo của tổ/kíp;
    /// trang xem không thấy.
    /// </summary>
    public IReadOnlyList<WorkPlanItemDto> Suggestions { get; set; } = [];
}

/// <summary>Bảng công việc của 1 xưởng trong 1 tuần (mọi tổ/kíp người gọi xem được).</summary>
public class WorkGridDto<TForm> where TForm : WeeklyFormDto
{
    public int WorkshopId { get; init; }
    public string WorkshopName { get; init; } = string.Empty;

    /// <summary>PLAN | REPORT.</summary>
    public string Phase { get; init; } = string.Empty;

    /// <summary>Vd "BÁO CÁO CÔNG VIỆC – X.CĐNĐ1 · Tuần 46 Tháng 11/2026".</summary>
    public string Title { get; init; } = string.Empty;

    public WorkWeekDto Week { get; init; } = null!;

    /// <summary>Đầu mục dùng được ở xưởng (đang dùng) + đầu mục đã ngừng nhưng có dòng, theo thứ tự nhóm.</summary>
    public IReadOnlyList<WorkCategoryDto> Categories { get; init; } = [];

    public IReadOnlyList<TForm> Forms { get; init; } = [];
}

/// <summary>Sheet Tổng hợp: mỗi đơn vị 1 dòng.</summary>
public class WorkReportSummaryDto
{
    public int WorkshopId { get; init; }
    public string WorkshopName { get; init; } = string.Empty;
    public string Phase { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public WorkWeekDto Week { get; init; } = null!;

    /// <summary>Cột phút công theo đầu mục (ShowInSummary).</summary>
    public IReadOnlyList<WorkCategoryDto> Columns { get; init; } = [];

    public IReadOnlyList<WorkReportSummaryRowDto> Rows { get; init; } = [];

    /// <summary>Dòng tổng cộng.</summary>
    public WorkReportSummaryRowDto Total { get; init; } = null!;
}

public class WorkReportSummaryRowDto
{
    public int? FormId { get; init; }
    public int? UnitId { get; init; }
    public string OrderLabel { get; init; } = string.Empty;
    public string UnitName { get; init; } = string.Empty;
    public string? LaborType { get; init; }
    public string? EngineerNames { get; init; }

    /// <summary>Số đầu mã vật tư (đếm mã khác nhau, không cộng số lượng).</summary>
    public int MaterialCodeCount { get; init; }

    /// <summary>Phút công theo Id đầu mục (kế hoạch: cột 11; báo cáo: cột 12, trống = kế hoạch).</summary>
    public IReadOnlyDictionary<int, decimal> MinutesByCategory { get; init; } = new Dictionary<int, decimal>();

    public decimal TotalMinutes { get; init; }
    public decimal CapacityMinutes { get; init; }

    /// <summary>Nhân lực quy đổi = tổng phút ÷ giờ công hiệu dụng/tuần (dòng tổng = cộng các dòng).</summary>
    public decimal Manpower { get; init; }

    public int ItemCount { get; init; }

    /// <summary>NOT_STARTED | OPEN | LOCKED; dòng tổng để trống.</summary>
    public string? Status { get; init; }
}

// ===== Request =====

/// <summary>Lọc lưới / tổng hợp / vật tư xưởng (giai đoạn theo đường dẫn API: /plan hoặc /report).</summary>
public class WorkReportGridRequest
{
    public int WorkshopId { get; set; }
    public int WeekId { get; set; }

    /// <summary>Chỉ lấy 1 đơn vị báo cáo.</summary>
    public int? UnitId { get; set; }
}
