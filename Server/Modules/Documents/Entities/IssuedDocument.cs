using Server.Shared.Entities;

namespace Server.Modules.Documents.Entities;

// ===== Entity =====

/// <summary>Số văn bản đã cấp (bảng cũ TEST.dbo.SoVanBanDaCap).</summary>
public class IssuedDocument : BaseEntity
{
    public int DocumentTemplateId { get; set; }

    /// <summary>Số thứ tự trong năm (0 với hồ sơ nghiệm thu: đánh số theo hợp đồng).</summary>
    public int SequenceNumber { get; set; }

    /// <summary>Năm cấp số (biên bản thanh toán theo hợp đồng: năm của hợp đồng; hồ sơ nghiệm thu: 0).</summary>
    public int Year { get; set; }

    /// <summary>Số hiệu văn bản, vd 01/2026/BBLV-NM.CĐ2.</summary>
    public string DocumentNumber { get; set; } = string.Empty;

    /// <summary>Thời điểm cấp số (giờ Việt Nam, như dữ liệu cũ).</summary>
    public DateTime IssuedAt { get; set; }

    public string IssuerName { get; set; } = string.Empty;
    public string IssuerEmpCode { get; set; } = string.Empty;

    /// <summary>Phân xưởng / đơn vị cấp 1 của người lấy số.</summary>
    public string IssuerUnit { get; set; } = string.Empty;

    /// <summary>Nội dung trích yếu.</summary>
    public string? Subject { get; set; }

    public string? ContractNumber { get; set; }

    /// <summary>Ngày ban hành.</summary>
    public DateOnly IssueDate { get; set; }

    public string? Note { get; set; }

    /// <summary>Trạng thái cập nhật ổ đĩa / ban hành (xem PublishStatuses).</summary>
    public string PublishStatus { get; set; } = PublishStatuses.Pending;

    public string? EOfficeLink { get; set; }

    public DocumentTemplate DocumentTemplate { get; set; } = null!;
}

// ===== Giá trị cố định =====

/// <summary>Dữ liệu cũ: chua → PENDING, co → PUBLISHED, huy → CANCELLED.</summary>
public static class PublishStatuses
{
    public const string Pending = "PENDING";
    public const string Published = "PUBLISHED";
    public const string Cancelled = "CANCELLED";

    public static readonly IReadOnlyCollection<string> All = [Pending, Published, Cancelled];

    public static string GetLabel(string status) => status switch
    {
        Published => "Đã ban hành",
        Cancelled => "Đã hủy",
        _ => "Chưa được ban hành",
    };
}
