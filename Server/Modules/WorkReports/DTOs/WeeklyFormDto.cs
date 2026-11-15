namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

/// <summary>Form tuần của 1 đơn vị (1 nhóm cấp 1 trên lưới), kèm trạng thái giai đoạn và quyền của người gọi.</summary>
public class WeeklyFormDto
{
    public int FormId { get; init; }
    public int UnitId { get; init; }
    public int WorkWeekId { get; init; }
    public int WorkshopId { get; init; }

    /// <summary>Thứ tự trong xưởng (1, 2…) và nhãn La Mã (I, II…).</summary>
    public int OrderNo { get; init; }

    public string OrderLabel { get; init; } = string.Empty;
    public string UnitName { get; init; } = string.Empty;
    public string CodePrefix { get; init; } = string.Empty;
    public string LaborType { get; init; } = string.Empty;
    public decimal CapacityMinutes { get; init; }
    public string? EngineerNames { get; init; }

    /// <summary>NOT_STARTED | OPEN | LOCKED của giai đoạn đang xem.</summary>
    public string Status { get; init; } = string.Empty;

    /// <summary>Hạn hiệu lực của giai đoạn đang xem (đã tính hạn riêng xưởng / mở khóa).</summary>
    public DateTime DeadlineAt { get; init; }

    public string PlanStatus { get; init; } = string.Empty;
    public DateTime PlanDeadlineAt { get; init; }
    public string ReportStatus { get; init; } = string.Empty;
    public DateTime ReportDeadlineAt { get; init; }

    /// <summary>Vai trò của người gọi trên đơn vị (WorkReportRoles).</summary>
    public string Role { get; init; } = string.Empty;

    /// <summary>Người gọi thêm/sửa/xóa dòng được ngay lúc này ở giai đoạn đang xem.</summary>
    public bool CanEditNow { get; init; }

    public bool CanEditLocked { get; init; }
    public bool CanRequestRevision { get; init; }
    public bool CanUnlock { get; init; }

    public int ItemCount { get; init; }

    /// <summary>Tổng (11) của các dòng đang hiện.</summary>
    public decimal TotalPlannedMinutes { get; init; }

    /// <summary>Tổng (12) (thực tế, trống = kế hoạch) của các dòng đang hiện.</summary>
    public decimal TotalActualMinutes { get; init; }

    /// <summary>Dòng công việc theo thứ tự đầu mục rồi thứ tự dòng (chỉ có ở API lưới).</summary>
    public IReadOnlyList<WorkItemDto> Items { get; init; } = [];
}

/// <summary>Bảng công việc của 1 xưởng trong 1 tuần (mọi tổ/kíp người gọi xem được).</summary>
public class WorkReportGridDto
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

    public IReadOnlyList<WeeklyFormDto> Forms { get; init; } = [];
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

public class WorkReportGridRequest
{
    public int WorkshopId { get; set; }
    public int WeekId { get; set; }

    /// <summary>PLAN | REPORT.</summary>
    public string Phase { get; set; } = string.Empty;

    /// <summary>Chỉ lấy 1 đơn vị báo cáo.</summary>
    public int? UnitId { get; set; }
}

/// <summary>Giai đoạn của thao tác ghi (query string ?phase=PLAN|REPORT).</summary>
public class WorkReportPhaseRequest
{
    public string Phase { get; set; } = string.Empty;
}
