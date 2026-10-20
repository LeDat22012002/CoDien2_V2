using Server.Shared.Entities;

namespace Server.Modules.Documents.Entities;

/// <summary>Biểu mẫu văn bản cần cấp số (bảng cũ TEST.dbo.BieuMau).</summary>
public class DocumentTemplate : BaseEntity
{
    /// <summary>Mã biểu mẫu, vd BM.12A-QT.09 (có thể trùng giữa các biểu mẫu).</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>Đuôi số cố định ghép vào số hiệu, vd PĐNTN-NM.CĐ2.</summary>
    public string NumberSuffix { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>Số bắt đầu cũ, giữ để tham khảo; không còn dùng khi cấp số (năm mới luôn bắt đầu từ 01).</summary>
    public int? StartNumber { get; set; }

    /// <summary>Quy trình áp dụng.</summary>
    public string? Process { get; set; }
}
