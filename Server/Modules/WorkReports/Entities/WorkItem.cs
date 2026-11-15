using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

// ===== Entity =====

/// <summary>
/// Dòng công việc, dùng chung cho kế hoạch và báo cáo (1 việc kế hoạch = 1 dòng; báo cáo thêm dòng phát sinh).
/// Không lưu: số người (đếm Workers), chênh lệch (thực tế − kế hoạch), tuần (theo form).
/// </summary>
public class WorkItem : BaseEntity
{
    public int WeeklyFormId { get; set; }

    public int WorkCategoryId { get; set; }

    /// <summary>{Tiền tố}-{Hậu tố đầu mục}-{STT:D2}, vd TCDKB-LV3-07. Đổi đầu mục → cấp mã mới.</summary>
    public string Code { get; set; } = string.Empty;

    public int CodeSeq { get; set; }

    /// <summary>Id thiết bị khi mã có trong danh mục; null = gõ tự do.</summary>
    public int? EquipmentId { get; set; }

    public string? EquipmentCode { get; set; }

    /// <summary>Bản chụp tên thiết bị.</summary>
    public string? EquipmentName { get; set; }

    /// <summary>Hạng mục công việc.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Ngày thực hiện, trong thứ 2 → Chủ nhật của tuần.</summary>
    public DateOnly WorkDate { get; set; }

    /// <summary>(11) Giờ công kế hoạch (phút); null với dòng phát sinh.</summary>
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

    /// <summary>(18) Ghi chú.</summary>
    public string? Note { get; set; }

    /// <summary>Dòng phát sinh (thêm ở giai đoạn báo cáo, không có trong kế hoạch).</summary>
    public bool IsUnplanned { get; set; }

    public int SortOrder { get; set; }

    /// <summary>rowversion của SQL Server: chống ghi đè khi nhiều người sửa cùng dòng.</summary>
    public byte[] RowVersion { get; set; } = [];

    public WeeklyForm WeeklyForm { get; set; } = null!;

    public WorkCategory WorkCategory { get; set; } = null!;

    public ICollection<WorkItemWorker> Workers { get; set; } = [];
}

// ===== Giá trị cố định =====

public static class WorkPermitValues
{
    public const string Yes = "Có";
    public const string No = "Không";

    public static readonly IReadOnlyCollection<string> All = [Yes, No];
}
