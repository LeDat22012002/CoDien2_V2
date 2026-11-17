namespace Server.Modules.Materials.Entities;

// ===== Entity =====

/// <summary>
/// Danh mục vật tư, bảng có sẵn dbo.Material (chuyển từ TEST.dbo.Materials). Không có cột audit / IsDeleted
/// nên không kế thừa BaseEntity, xóa là xóa cứng.
/// Tên property khác tên cột cho dễ đọc (C# không cho property trùng tên class): Code = cột Material,
/// Description = MaterialDescription, Uom = BOM (đơn vị tính), DocumentNo = SoTaiLieu.
/// Dùng để gợi ý mã vật tư, tự điền tên và đơn vị tính ở báo cáo công việc tuần; không ràng buộc nhập.
/// </summary>
public class Material
{
    public int Id { get; set; }

    /// <summary>Mã vật tư (cột Material). Một mã có thể lặp ở nhiều Plant; cặp (mã, Plant) không trùng.</summary>
    public string? Code { get; set; }

    /// <summary>Tên vật tư (cột MaterialDescription).</summary>
    public string? Description { get; set; }

    public string? BasicDataText { get; set; }
    public string? Plant { get; set; }
    public string? MaterialGroup { get; set; }
    public string? Class { get; set; }
    public string? Level { get; set; }
    public string? MaterialLevel { get; set; }

    /// <summary>Số tài liệu (cột SoTaiLieu).</summary>
    public string? DocumentNo { get; set; }

    public string? TypeOfSupplies { get; set; }

    /// <summary>Đơn vị tính (cột BOM).</summary>
    public string? Uom { get; set; }
}