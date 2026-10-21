using Server.Shared.Entities;

namespace Server.Modules.Equipments.Entities;

/// <summary>Danh mục thiết bị (bảng cũ TEST.dbo.Equipment); dùng để chọn thiết bị khi báo cáo sự cố.</summary>
public class Equipment : BaseEntity
{
    /// <summary>Mã thiết bị (MaEquipment cũ), duy nhất.</summary>
    public string Code { get; set; } = string.Empty;

    public string? Name { get; set; }
}
