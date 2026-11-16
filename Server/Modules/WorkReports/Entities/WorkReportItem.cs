namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// Dòng báo cáo tuần: thêm/sửa/xóa tự do trong từng đầu mục khi báo cáo đang mở. Lưu xong là trang xem thấy ngay.
/// Dòng lấy từ gợi ý kế hoạch giữ mã công việc và giờ công kế hoạch (bản chụp) của dòng kế hoạch đó.
/// </summary>
public class WorkReportItem : WorkItemBase<WorkReportItemWorker>
{
    /// <summary>Dòng kế hoạch gốc; null = việc phát sinh (không có trong kế hoạch).</summary>
    public int? PlanItemId { get; set; }

    /// <summary>(11) Giờ công kế hoạch chụp từ dòng kế hoạch; null với việc phát sinh.</summary>
    public decimal? PlannedMinutes { get; set; }

    /// <summary>(12) Giờ công thực tế (phút); null = coi bằng kế hoạch.</summary>
    public decimal? ActualMinutes { get; set; }

    /// <summary>(14) Kết quả thực hiện 0–100.</summary>
    public decimal? ResultPercent { get; set; }

    /// <summary>(15) GPLV: "Có" | "Không" | null.</summary>
    public string? WorkPermit { get; set; }

    /// <summary>(16) 5S (chữ).</summary>
    public string? FiveS { get; set; }

    /// <summary>(17) Diễn giải.</summary>
    public string? Explanation { get; set; }
}

public class WorkReportItemWorker : WorkItemWorkerBase
{
    public int WorkReportItemId { get; set; }

    public WorkReportItem WorkReportItem { get; set; } = null!;
}

// ===== Giá trị cố định =====

public static class WorkPermitValues
{
    public const string Yes = "Có";
    public const string No = "Không";

    public static readonly IReadOnlyCollection<string> All = [Yes, No];
}
