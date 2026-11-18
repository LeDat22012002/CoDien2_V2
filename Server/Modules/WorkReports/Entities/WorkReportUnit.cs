using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

// ===== Entity =====

/// <summary>
/// Đơn vị báo cáo có form tuần riêng (tương ứng 1 "sheet tổ" trong Excel):
/// - Theo sơ đồ (IsCustom = false): 1 tổ (GROUP) / kíp (SHIFT), tự tạo khi tổ/kíp có trên sơ đồ
///   (WorkReportUnitSyncService); quản đốc xóa (chưa có dữ liệu) thì không tự tạo lại, khôi phục được.
/// - Tự đặt (IsCustom = true): quản đốc tạo thêm, gắn với 1 đội hoặc xưởng trên sơ đồ.
/// Xưởng không lưu cứng mà tính từ cây tổ chức qua OrgUnitId (tổ chuyển xưởng thì tuần mới theo xưởng mới).
/// </summary>
public class WorkReportUnit : BaseEntity
{
    /// <summary>
    /// Đơn vị gốc trên sơ đồ: OrgUnit.Id của tổ/kíp (theo sơ đồ, mỗi tổ/kíp tối đa 1 đơn vị kể cả đã xóa),
    /// hoặc của đội / xưởng chứa đơn vị tự đặt. Quyết định xưởng, đội trưởng quản lý, gợi ý người và kỹ sư.
    /// </summary>
    public int OrgUnitId { get; set; }

    /// <summary>True = đơn vị tự đặt (không phải tổ/kíp trên sơ đồ).</summary>
    public bool IsCustom { get; set; }

    /// <summary>Tên hiện trên bảng, vd "Tổ cơ điện - theo ca - kíp B"; mặc định lấy tên OrgUnit.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Tiền tố mã công việc, vd "TCDKB" → TCDKB-LV1-01. Duy nhất trong 1 xưởng.</summary>
    public string CodePrefix { get; set; } = string.Empty;

    /// <summary>HC | KIP: quyết định giờ công hiệu dụng dùng quy đổi nhân lực.</summary>
    public string LaborType { get; set; } = LaborTypes.Hc;

    /// <summary>Thứ tự I, II… trong xưởng (bảng công việc và Tổng hợp).</summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Đơn vị tự đặt gộp nhiều tổ (vd 1 sheet "Tổ Cơ khí - Lọc bụi - Lò cao 1–4" gộp 2 tổ Lọc bụi trên sơ đồ):
    /// OrgUnit.Id các tổ nằm trong đội/xưởng gắn. Người thực hiện và "Cả tổ" chỉ lấy nhân viên các tổ này.
    /// Rỗng = lấy cả đội/xưởng gắn (như trước). Đơn vị theo sơ đồ luôn rỗng.
    /// </summary>
    public List<int> MemberOrgUnitIds { get; set; } = [];

    /// <summary>False = không tạo form từ tuần sau; dữ liệu cũ giữ nguyên.</summary>
    public bool IsActive { get; set; } = true;

    public ICollection<WorkReportUnitEngineer> Engineers { get; set; } = [];
}

// ===== Giá trị cố định =====

public static class LaborTypes
{
    /// <summary>Hành chính.</summary>
    public const string Hc = "HC";

    /// <summary>Theo ca (kíp).</summary>
    public const string Shift = "KIP";

    public static readonly IReadOnlyCollection<string> All = [Hc, Shift];
}