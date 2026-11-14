using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

/// <summary>Mục đích sử dụng vật tư (sheet Vật tư): BTBD, BTSC, TTTX, THTX, Phục hồi, VTDP, Gói thầu, CTCT.</summary>
public class MaterialPurpose : BaseEntity
{
    /// <summary>Giá trị hiển thị trong dropdown, duy nhất.</summary>
    public string Code { get; set; } = string.Empty;

    public string? Name { get; set; }

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;
}