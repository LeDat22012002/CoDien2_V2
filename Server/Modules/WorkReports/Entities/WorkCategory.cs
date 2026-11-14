using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

// ===== Entity =====

/// <summary>
/// Đầu mục công việc (nhóm A–I trên form): BT-LV1…LV4, BT phản ứng, PHNB, CTCT, 5S, Khác.
/// Dùng chung toàn nhà máy; <see cref="Workshops"/> rỗng = áp dụng mọi xưởng, có dòng = chỉ các xưởng đó.
/// Đã có dữ liệu thì chỉ ngừng dùng (IsActive false), không xóa.
/// </summary>
public class WorkCategory : BaseEntity
{
    /// <summary>Giá trị hiện trong dropdown cột (3), vd "BT-LV1", "BT Phản ứng". Duy nhất.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Ký hiệu nhóm trên bảng: A, B, C…</summary>
    public string GroupLetter { get; set; } = string.Empty;

    /// <summary>Tên nhóm, vd "Bảo trì level 1".</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Hậu tố mã công việc, vd "LV1" → TCDKB-LV1-01. Duy nhất. Đổi không ảnh hưởng mã đã sinh.</summary>
    public string CodeSuffix { get; set; } = string.Empty;

    /// <summary>Thứ tự nhóm trên bảng và thứ tự cột trên Tổng hợp.</summary>
    public int SortOrder { get; set; }

    /// <summary>Có thành 1 cột phút công trên sheet Tổng hợp.</summary>
    public bool ShowInSummary { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public ICollection<WorkCategoryWorkshop> Workshops { get; set; } = [];
}