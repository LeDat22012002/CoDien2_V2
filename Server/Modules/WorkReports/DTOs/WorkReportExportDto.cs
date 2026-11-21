namespace Server.Modules.WorkReports.DTOs;

// ===== Request =====

/// <summary>Xuất Excel kế hoạch / báo cáo tuần của 1 xưởng (các tổ/kíp người gọi xem được).</summary>
public class WorkReportExportRequest
{
    public int WorkshopId { get; set; }
    public int WeekId { get; set; }

    /// <summary>PLAN | REPORT.</summary>
    public string Phase { get; set; } = string.Empty;
}

// ===== Response =====

/// <summary>File Excel đã dựng: tên file (có đuôi .xlsx) và nội dung.</summary>
public sealed record WorkReportExportFile(string FileName, byte[] Content)
{
    public const string ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}