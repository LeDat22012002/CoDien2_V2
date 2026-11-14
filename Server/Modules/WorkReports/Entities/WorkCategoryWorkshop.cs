namespace Server.Modules.WorkReports.Entities;

/// <summary>Xưởng (đơn vị cấp 1) được dùng đầu mục. Bảng nối, xóa cứng khi đổi danh sách xưởng.</summary>
public class WorkCategoryWorkshop
{
    public int WorkCategoryId { get; set; }

    /// <summary>OrgUnit.Id của xưởng (đơn vị ngay dưới Nhà máy).</summary>
    public int WorkshopId { get; set; }

    public WorkCategory WorkCategory { get; set; } = null!;
}