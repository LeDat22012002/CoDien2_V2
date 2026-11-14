using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

// ===== Entity =====

/// <summary>
/// Đơn vị báo cáo = 1 tổ (OrgUnit GROUP) hoặc 1 kíp (OrgUnit SHIFT) có form tuần riêng (tương ứng 1 "sheet tổ" trong Excel).
/// Xưởng không lưu cứng mà tính từ cây tổ chức (tổ chuyển xưởng thì tuần mới theo xưởng mới).
/// </summary>
public class WorkReportUnit : BaseEntity
{
    /// <summary>OrgUnit.Id của tổ/kíp; mỗi OrgUnit tối đa 1 đơn vị báo cáo.</summary>
    public int OrgUnitId { get; set; }

    /// <summary>Tên hiện trên bảng, vd "Tổ cơ điện - theo ca - kíp B"; mặc định lấy tên OrgUnit.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Tiền tố mã công việc, vd "TCDKB" → TCDKB-LV1-01. Duy nhất trong 1 xưởng.</summary>
    public string CodePrefix { get; set; } = string.Empty;

    /// <summary>HC | KIP: quyết định giờ công hiệu dụng dùng quy đổi nhân lực.</summary>
    public string LaborType { get; set; } = LaborTypes.Hc;

    /// <summary>Thứ tự I, II… trong xưởng (bảng công việc và Tổng hợp).</summary>
    public int SortOrder { get; set; }

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