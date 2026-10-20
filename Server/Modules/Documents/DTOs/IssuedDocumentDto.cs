using Server.Shared.Models;

namespace Server.Modules.Documents.DTOs;

// ===== Response =====

public class IssuedDocumentDto
{
    public int Id { get; init; }
    public int DocumentTemplateId { get; init; }
    public int SequenceNumber { get; init; }
    public int Year { get; init; }
    public string DocumentNumber { get; init; } = string.Empty;
    public DateTime IssuedAt { get; init; }
    public string IssuerName { get; init; } = string.Empty;
    public string IssuerEmpCode { get; init; } = string.Empty;
    public string IssuerUnit { get; init; } = string.Empty;
    public string? Subject { get; init; }
    public string? ContractNumber { get; init; }
    public DateOnly IssueDate { get; init; }
    public string? Note { get; init; }

    /// <summary>PENDING | PUBLISHED | CANCELLED.</summary>
    public string PublishStatus { get; init; } = string.Empty;

    public string? EOfficeLink { get; init; }

    // Thông tin biểu mẫu
    public string TemplateCode { get; init; } = string.Empty;
    public string TemplateName { get; init; } = string.Empty;
    public string NumberSuffix { get; init; } = string.Empty;
}

/// <summary>Kết quả cấp số.</summary>
public class IssueResultDto
{
    public int Id { get; init; }
    public string DocumentNumber { get; init; } = string.Empty;
    public DateTime IssuedAt { get; init; }

    /// <summary>Số lần nghiệm thu (chỉ có với hồ sơ nghiệm thu).</summary>
    public int? AcceptanceCount { get; init; }
}

// ===== Request: cấp số =====

/// <summary>Trường chung khi cấp số. Họ tên, mã NV, phân xưởng lấy từ tài khoản đăng nhập.</summary>
public abstract class IssueDocumentRequestBase
{
    public int DocumentTemplateId { get; set; }

    /// <summary>Nội dung trích yếu.</summary>
    public string? Subject { get; set; }

    /// <summary>Ngày ban hành.</summary>
    public DateOnly IssueDate { get; set; }
}

/// <summary>Văn bản thường: {STT}/{Năm}/{Đuôi số}.</summary>
public class IssueStandardDocumentRequest : IssueDocumentRequestBase;

/// <summary>Hồ sơ nghiệm thu: {Lần NT}/{Số HĐ}/{Tên viết tắt}, đánh số theo cặp Số HĐ + Tên viết tắt.</summary>
public class IssueAcceptanceRecordRequest : IssueDocumentRequestBase
{
    /// <summary>Vd 25/HĐXD-HPDQ.</summary>
    public string ContractNumber { get; set; } = string.Empty;

    /// <summary>Vd BM-NM.CĐ2.</summary>
    public string ShortName { get; set; } = string.Empty;
}

/// <summary>Xác nhận kỹ thuật: XNKT.{STT}-{Năm}/{Số PR}/{Nhà thầu}.</summary>
public class IssueTechnicalConfirmationRequest : IssueDocumentRequestBase
{
    public string PrNumber { get; set; } = string.Empty;

    /// <summary>Vd HPDQ-CÔNG TY ABC.</summary>
    public string Contractor { get; set; } = string.Empty;
}

/// <summary>Phương án kỹ thuật: {STT}/{Năm}/PAKT-NM.CĐ2-{Nhà thầu}.</summary>
public class IssueTechnicalPlanRequest : IssueDocumentRequestBase
{
    public string Contractor { get; set; } = string.Empty;
}

/// <summary>
/// Biên bản xác nhận khối lượng thanh toán công đoạn: {STT}/{Số HĐ}/{Năm HĐ}/{Đuôi số}, đánh số theo hợp đồng.
/// IsNew = true: hợp đồng chưa từng cấp số → STT 01, năm lấy theo Year; false: tăng STT, năm lấy theo lần cấp trước.
/// </summary>
public class IssueContractPaymentRequest : IssueDocumentRequestBase
{
    public string ContractNumber { get; set; } = string.Empty;
    public bool IsNew { get; set; }

    /// <summary>Năm ký hợp đồng, chỉ dùng khi IsNew = true.</summary>
    public int? Year { get; set; }
}

// ===== Request: quản lý =====

/// <summary>Chỉ cập nhật các trường có giá trị (để trống = giữ nguyên).</summary>
public class UpdateIssuedDocumentRequest
{
    public string? Subject { get; set; }
    public string? Note { get; set; }

    /// <summary>PENDING | PUBLISHED | CANCELLED.</summary>
    public string? PublishStatus { get; set; }

    public string? EOfficeLink { get; set; }
}

/// <summary>Lọc sổ văn bản: Keyword không dùng; FromDate/ToDate theo ngày ban hành.</summary>
public class IssuedDocumentFilterRequest : PagedRequest
{
    public int? DocumentTemplateId { get; set; }
    public string? IssuerEmpCode { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? Note { get; set; }
}
