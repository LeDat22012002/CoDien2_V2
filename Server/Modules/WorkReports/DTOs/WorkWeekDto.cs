namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class WorkWeekDto
{
    public int Id { get; init; }
    public int IsoYear { get; init; }
    public int IsoWeek { get; init; }
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public int LabelMonth { get; init; }
    public int LabelYear { get; init; }

    /// <summary>Vd "Tuần 46 · Tháng 11/2026 · 09/11–15/11".</summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>Hạn chung toàn nhà máy.</summary>
    public DateTime PlanDeadlineAt { get; init; }

    public DateTime ReportDeadlineAt { get; init; }
    public bool IsDeadlineCustomized { get; init; }

    /// <summary>Hạn áp dụng cho xưởng đang xem (đã tính hạn riêng); không truyền xưởng = hạn chung.</summary>
    public DateTime EffectivePlanDeadlineAt { get; init; }

    public DateTime EffectiveReportDeadlineAt { get; init; }

    public IReadOnlyList<WorkWeekDeadlineOverrideDto> Overrides { get; init; } = [];
}

public class WorkWeekDeadlineOverrideDto
{
    public int WorkshopId { get; init; }
    public string? WorkshopName { get; init; }

    /// <summary>Null = theo hạn chung.</summary>
    public DateTime? PlanDeadlineAt { get; init; }

    public DateTime? ReportDeadlineAt { get; init; }
}

/// <summary>
/// Tuần đang làm việc tại thời điểm gọi: ReportWeek = tuần còn đang nhập báo cáo
/// (sáng thứ 2 trước hạn vẫn là tuần trước), PlanWeek = tuần kế tiếp của ReportWeek (đang lập kế hoạch).
/// </summary>
public class WorkingWeeksDto
{
    public DateTime Now { get; init; }
    public WorkWeekDto ReportWeek { get; init; } = null!;
    public WorkWeekDto PlanWeek { get; init; } = null!;
}

// ===== Request =====

/// <summary>
/// WorkshopId null = sửa hạn chung của tuần (bắt buộc đủ 2 hạn, trừ khi ResetToDefault).
/// WorkshopId có giá trị = hạn riêng của xưởng; hạn để null = theo hạn chung, cả 2 null = bỏ hạn riêng.
/// </summary>
public class UpdateWorkWeekDeadlineRequest
{
    public int? WorkshopId { get; set; }
    public DateTime? PlanDeadlineAt { get; set; }
    public DateTime? ReportDeadlineAt { get; set; }

    /// <summary>Hạn chung: tính lại theo cấu hình mặc định.</summary>
    public bool ResetToDefault { get; set; }
}

public class WorkWeekFilterRequest
{
    /// <summary>Năm ISO; null = năm hiện tại.</summary>
    public int? Year { get; set; }

    public int? WorkshopId { get; set; }
}